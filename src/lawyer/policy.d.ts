/** The managed fork supplies this shared singleton; never inline a second policy. */
declare module '@deepseek-ai/dsh-product-policy' {
  export function assertLawyerFileAccess(path: string): void
  export function isLawyerPolicyEnabled(): boolean
}
