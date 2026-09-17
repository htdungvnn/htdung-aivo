export type AppEnv = {
  Bindings: CloudflareBindings;
  Variables: {
    requestId: string;
  };
};

export type ServiceName =
  | 'auth'
  | 'profile'
  | 'workouts'
  | 'nutrition'
  | 'ai'
  | 'billing';
