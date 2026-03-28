<script setup>
import { Head, useForm } from '@inertiajs/vue3';

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
    <Head title="Create organization" />

    <div class="auth-wrap">
        <div class="auth-card auth-card-wide">
            <div class="auth-brand">
                <a href="/">Snag</a>
                <p>Every report belongs to an organization. Create one now or select an existing membership as your active workspace.</p>
            </div>

            <div class="split">
                <section class="panel panel-pad">
                    <div class="section-head">
                        <div>
                            <h2>New organization</h2>
                            <p>The creator becomes owner and starts on the free entitlement tier.</p>
                        </div>
                    </div>

                    <form class="auth-form" @submit.prevent="submit">
                        <div class="field">
                            <label for="organization-name">Organization name</label>
                            <input
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
                            <button class="button button-primary" type="submit" :disabled="form.processing">
                                Create organization
                            </button>
                        </div>
                    </form>
                </section>

                <section class="panel panel-pad">
                    <div class="section-head">
                        <div>
                            <h2>Existing memberships</h2>
                            <p v-if="existingMemberships.length">Use an existing organization without creating another slug or billing record.</p>
                            <p v-else>No memberships found for this account yet.</p>
                        </div>
                    </div>

                    <div v-if="existingMemberships.length" class="stack">
                        <article v-for="organization in existingMemberships" :key="organization.id" class="surface-note">
                            <div class="actions-inline" style="justify-content: space-between;">
                                <div>
                                    <div style="font-weight: 600;">{{ organization.name }}</div>
                                    <div class="muted mono" style="font-size: 0.88rem;">{{ organization.slug }}</div>
                                </div>
                                <button
                                    class="button button-secondary"
                                    type="button"
                                    :disabled="switchForm.processing"
                                    @click="switchOrganization(organization.id)"
                                >
                                    Use this organization
                                </button>
                            </div>
                        </article>
                    </div>

                    <div v-else class="empty-state">
                        Invitations and accepted memberships will appear here when available.
                    </div>
                </section>
            </div>
        </div>
    </div>
</template>
