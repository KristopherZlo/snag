<?php

namespace App\Runtime\Xampp;

use PDO;
use PDOException;
use RuntimeException;

class XamppDatabaseProvisioner
{
    public function ensureDatabase(XamppRuntimeProfile $profile): void
    {
        $databaseName = $this->validatedDatabaseName($profile->dbDatabase);

        $connection = $this->connect($profile);
        $connection->exec(
            sprintf(
                'CREATE DATABASE IF NOT EXISTS `%s` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci',
                $databaseName
            )
        );
    }

    /**
     * @return array{healthy: bool, message: string}
     */
    public function probe(XamppRuntimeProfile $profile): array
    {
        try {
            $this->connect($profile, includeDatabase: true);

            return [
                'healthy' => true,
                'message' => sprintf('%s:%d/%s', $profile->dbHost, $profile->dbPort, $profile->dbDatabase),
            ];
        } catch (PDOException $exception) {
            return [
                'healthy' => false,
                'message' => $exception->getMessage(),
            ];
        }
    }

    private function connect(XamppRuntimeProfile $profile, bool $includeDatabase = false): PDO
    {
        $dsn = sprintf(
            'mysql:host=%s;port=%d;charset=utf8mb4%s',
            $profile->dbHost,
            $profile->dbPort,
            $includeDatabase ? ';dbname='.$this->validatedDatabaseName($profile->dbDatabase) : ''
        );

        return new PDO($dsn, $profile->dbUsername, $profile->dbPassword, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
    }

    private function validatedDatabaseName(string $databaseName): string
    {
        if (! preg_match('/^[A-Za-z0-9_]+$/', $databaseName)) {
            throw new RuntimeException('XAMPP database names may only contain letters, numbers, and underscores.');
        }

        return $databaseName;
    }
}
