// VuePress resolves these theme-owned aliases at build time.
declare module '@theme/*.vue' {
  const component: import('vue').DefineComponent
  export default component
}

declare module '@internal/home-hero-effects' {
  export const effects: string[]
  export const effectComponents: Record<string, import('vue').Component>
}
