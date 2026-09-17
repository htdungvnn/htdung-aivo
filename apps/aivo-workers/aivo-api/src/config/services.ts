import type { ServiceName } from '../types';

export function resolveServiceUrl(env: CloudflareBindings, service: ServiceName): string {
  const services: Record<ServiceName, string> = {
    auth: env.AUTH_SERVICE_URL,
    profile: env.PROFILE_SERVICE_URL,
    workouts: env.WORKOUT_SERVICE_URL,
    nutrition: env.NUTRITION_SERVICE_URL,
    ai: env.AI_SERVICE_URL,
    billing: env.BILLING_SERVICE_URL,
  };
  return services[service];
}

export const validServices = new Set<ServiceName>([
  'auth', 'profile', 'workouts', 'nutrition', 'ai', 'billing',
]);
