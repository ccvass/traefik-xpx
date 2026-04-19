export interface Overview {
  http: { routers: ResourceCount; services: ResourceCount; middlewares: ResourceCount }
  tcp: { routers: ResourceCount; services: ResourceCount; middlewares: ResourceCount }
  udp: { routers: ResourceCount; services: ResourceCount }
  features: Record<string, boolean | string>
  providers: Record<string, boolean>
}

export interface ResourceCount {
  total: number
  warnings: number
  errors: number
}

export interface Router {
  name: string
  provider: string
  status: string
  rule: string
  service: string
  entryPoints?: string[]
  middlewares?: string[]
}

export interface Service {
  name: string
  provider: string
  status: string
  type: string
}

export interface Middleware {
  name: string
  provider: string
  status: string
  type: string
}

export interface Entrypoint {
  name: string
  address: string
}

export interface FeatureStatus {
  enabled: boolean
  module: string
  status: string
  components: number
}

export interface GrafanaDashboard {
  title: string
  uid: string
  description: string
  panels: { title: string; type: string }[]
}
