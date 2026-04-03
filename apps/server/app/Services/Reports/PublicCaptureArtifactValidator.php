<?php

namespace App\Services\Reports;

use App\Enums\ArtifactKind;
use App\Models\UploadSession;
use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class PublicCaptureArtifactValidator
{
    /**
     * @return array<string, array{byte_size:int, checksum:string, content_type:string, meta:array<string, mixed>}>
     */
    public function validate(UploadSession $session): array
    {
        $disk = Storage::disk(config('snag.storage.artifact_disk'));
        $validated = [];

        foreach ($session->artifacts ?? [] as $artifact) {
            if (! is_array($artifact)) {
                $this->invalid();
            }

            $key = (string) ($artifact['key'] ?? '');

            if ($key === '' || ! $disk->exists($key)) {
                $this->invalid();
            }

            $kind = (string) ($artifact['kind'] ?? '');
            $byteSize = (int) $disk->size($key);

            if ($byteSize < 1 || $byteSize > $this->maxBytesFor($kind)) {
                $this->invalid();
            }

            $contentType = $this->validatedContentType($disk, $key, $kind, (string) ($artifact['content_type'] ?? ''));
            $contents = $kind === ArtifactKind::Debugger->value || $kind === ArtifactKind::Screenshot->value || $kind === ArtifactKind::Video->value
                ? $disk->get($key)
                : null;

            if ($kind === ArtifactKind::Debugger->value) {
                $this->validateDebuggerPayload((string) $contents);
            } else {
                $this->validateBinarySignature($kind, (string) $contents);
            }

            $validated[$key] = [
                'byte_size' => $byteSize,
                'checksum' => $this->checksum($disk, $key),
                'content_type' => $contentType,
                'meta' => [
                    'validated_public_capture' => true,
                ],
            ];
        }

        return $validated;
    }

    private function maxBytesFor(string $kind): int
    {
        return max(1, (int) config("snag.capture.public.artifacts.{$kind}.max_bytes", 1));
    }

    private function validatedContentType(FilesystemAdapter $disk, string $key, string $kind, string $expected): string
    {
        $contentType = $disk->mimeType($key);
        $contentType = is_string($contentType) && $contentType !== '' ? $contentType : $expected;
        $allowed = config("snag.capture.public.artifacts.{$kind}.mime_types", []);

        if (! is_array($allowed) || ! in_array($contentType, $allowed, true)) {
            $this->invalid();
        }

        return $contentType;
    }

    private function validateDebuggerPayload(string $contents): void
    {
        try {
            $payload = json_decode($contents, true, flags: JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            $this->invalidDebugger();
        }

        if (! is_array($payload)) {
            $this->invalidDebugger();
        }

        $allowedKeys = ['actions', 'logs', 'network_requests', 'networkRequests', 'context', 'meta'];

        if (array_diff(array_keys($payload), $allowedKeys) !== []) {
            $this->invalidDebugger();
        }

        $maxItems = max(1, (int) config('snag.capture.public.artifacts.max_debugger_items', 500));
        $validator = Validator::make($payload, [
            'actions' => ['sometimes', 'array', 'max:'.$maxItems],
            'actions.*' => ['array'],
            'logs' => ['sometimes', 'array', 'max:'.$maxItems],
            'logs.*' => ['array'],
            'network_requests' => ['sometimes', 'array', 'max:'.$maxItems],
            'network_requests.*' => ['array'],
            'networkRequests' => ['sometimes', 'array', 'max:'.$maxItems],
            'networkRequests.*' => ['array'],
            'context' => ['sometimes', 'array'],
            'meta' => ['sometimes', 'array'],
        ]);

        if ($validator->fails()) {
            $this->invalidDebugger();
        }
    }

    private function validateBinarySignature(string $kind, string $contents): void
    {
        if ($kind === ArtifactKind::Screenshot->value && ! str_starts_with($contents, "\x89PNG\r\n\x1a\n")) {
            $this->invalid();
        }

        if ($kind === ArtifactKind::Video->value && ! str_starts_with($contents, "\x1A\x45\xDF\xA3")) {
            $this->invalid();
        }
    }

    private function checksum(FilesystemAdapter $disk, string $key): string
    {
        $stream = $disk->readStream($key);

        if (! is_resource($stream)) {
            $this->invalid();
        }

        $hash = hash_init('sha256');

        while (! feof($stream)) {
            $chunk = fread($stream, 1024 * 1024);

            if ($chunk === false) {
                fclose($stream);
                $this->invalid();
            }

            hash_update($hash, $chunk);
        }

        fclose($stream);

        return hash_final($hash);
    }

    private function invalid(): never
    {
        throw ValidationException::withMessages([
            'upload_session_token' => 'artifact_mismatch',
        ]);
    }

    private function invalidDebugger(): never
    {
        throw ValidationException::withMessages([
            'upload_session_token' => 'invalid_debugger_artifact',
        ]);
    }
}
