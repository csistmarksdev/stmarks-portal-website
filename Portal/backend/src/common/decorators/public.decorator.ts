import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_KEY = "isPublic";

/** Marks a route as unauthenticated (the public Website contract endpoints). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
