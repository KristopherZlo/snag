<script setup>
import { Head, useForm } from '@inertiajs/vue3';
import GuestLayout from '@/Layouts/GuestLayout.vue';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

defineProps({
    existingMemberships: {
        type: Array,
        required: true,
    },
});

const form = useForm({
    name: '',
});

const switchForm = useForm({
    organization_id: null,
});

const submit = () => {
    form.post(route('organizations.store'));
};

const switchOrganization = (organizationId) => {
    switchForm.organization_id = organizationId;
    switchForm.post(route('organizations.switch'));
};
</script>

<template>
    <GuestLayout wide>
        <Head title="Create organization" />

        <div class="space-y-2">
            <h1 class="text-2xl font-semibold tracking-tight">Create or activate an organization.</h1>
            <p class="text-sm text-muted-foreground">
                Every report belongs to an organization. Start a new workspace or reuse an existing membership now.
            </p>
        </div>

        <div class="grid gap-6 xl:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle class="text-base">New organization</CardTitle>
                    <CardDescription>
                        The creator becomes owner and starts on the free entitlement tier.
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    <form class="space-y-4" @submit.prevent="submit">
                        <div class="space-y-2">
                            <Label for="organization-name">Organization name</Label>
                            <Input
                                id="organization-name"
                                v-model="form.name"
                                type="text"
                                required
                                autofocus
                                placeholder="Acme Product Team"
                            />
                            <p v-if="form.errors.name" class="text-sm text-destructive">{{ form.errors.name }}</p>
                        </div>

                        <CardFooter class="justify-end px-0 pb-0">
                            <Button type="submit" :disabled="form.processing">Create organization</Button>
                        </CardFooter>
                    </form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle class="text-base">Existing memberships</CardTitle>
                    <CardDescription v-if="existingMemberships.length">
                        Reuse an existing organization without creating a new workspace boundary.
                    </CardDescription>
                    <CardDescription v-else>No memberships found for this account yet.</CardDescription>
                </CardHeader>

                <CardContent>
                    <div v-if="existingMemberships.length" class="space-y-3">
                        <Card
                            v-for="organization in existingMemberships"
                            :key="organization.id"
                            class="py-0 shadow-none"
                        >
                            <CardContent class="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <div class="font-medium">{{ organization.name }}</div>
                                    <div class="font-mono text-sm text-muted-foreground">{{ organization.slug }}</div>
                                </div>

                                <Button
                                    variant="outline"
                                    :disabled="switchForm.processing && switchForm.organization_id === organization.id"
                                    @click="switchOrganization(organization.id)"
                                >
                                    Use this organization
                                </Button>
                            </CardContent>
                        </Card>
                    </div>

                    <div v-else class="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                        Invitations and accepted memberships will appear here when available.
                    </div>
                </CardContent>
            </Card>
        </div>
    </GuestLayout>
</template>
