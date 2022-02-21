/* eslint-disable @typescript-eslint/no-explicit-any */

declare module '*.yaml' {
  const data: any
  export default data
}
declare module '*.yml' {
  const data: any
  export default data
}

declare const GMP: typeof GM
