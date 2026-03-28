import type { BillingPlan, EntitlementSnapshot } from './contracts';

export const entitlementMatrix: Record<BillingPlan, EntitlementSnapshot> = {
    free: {
        plan: 'free',
        members: 3,
        video_seconds: 0,
        can_record_video: false,
    },
    pro: {
        plan: 'pro',
        members: 10,
        video_seconds: 300,
        can_record_video: true,
    },
    studio: {
        plan: 'studio',
        members: 50,
        video_seconds: 1800,
        can_record_video: true,
    },
};
