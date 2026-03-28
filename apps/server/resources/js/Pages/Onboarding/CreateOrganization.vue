<script setup>
import GuestLayout from '@/Layouts/GuestLayout.vue';
import { Head, useForm } from '@inertiajs/vue3';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';

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

        <div class="auth-page-header">
            <div class="auth-page-eyebrow">Workspace setup</div>
            <h1>Create or activate an organization</h1>
            <p>Every report belongs to an organization. Start a new workspace or switch into an existing membership now.</p>
        </div>

        <div class="split">
            <section class="surface-note">
                <div class="section-head">
                    <div>
                        <h2>New organization</h2>
                        <p>The creator becomes owner and starts on the free entitlement tier.</p>
                    </div>
                </div>

                <form class="auth-form" @submit.prevent="submit">
                    <div class="field">
                        <label for="organization-name">Organization name</label>
                        <InputText
                            id="organization-name"
                            v-model="form.name"
                            type="text"
                            required
                            autofocus
                            placeholder="Acme Product Team"
                        />
                        <p v-if="form.errors.name" class="field-error">{{ form.errors.name }}</p>
                    </div>

                    <div class="auth-actions" style="justify-content: end;">
                        <Button label="Create organization" type="submit" :loading="form.processing" />
                    </div>
                </form>
            </section>

            <section class="surface-note">
                <div class="section-head">
                    <div>
                        <h2>Existing memberships</h2>
                        <p v-if="existingMemberships.length">Reuse an existing organization without creating a new workspace boundary.</p>
                        <p v-else>No memberships found for this account yet.</p>
                    </div>
                </div>

                <div v-if="existingMemberships.length" class="artifact-list">
                    <article v-for="organization in existingMemberships" :key="organization.id" class="artifact-item">
                        <div class="artifact-item-head">
                            <div>
                                <div class="artifact-kind">{{ organization.name }}</div>
                                <div class="muted mono">{{ organization.slug }}</div>
                            </div>
                            <Button
                                label="Use this organization"
                                severity="secondary"
                                :loading="switchForm.processing && switchForm.organization_id === organization.id"
                                @click="switchOrganization(organization.id)"
                            />
                        </div>
                    </article>
                </div>

                <div v-else class="empty-state">
                    Invitations and accepted memberships will appear here when available.
                </div>
            </section>
        </div>
    </GuestLayout>
</template>
