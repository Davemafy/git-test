export type Breakpoint = 'desktop' | 'tablet' | 'mobile'
export type ParticipantType = 'human' | 'agent' | 'system'
export type ProposalStatus = 'working' | 'ready' | 'accepted' | 'rejected' | 'stale' | 'conflicted'
export type AdmissionStatus = 'requesting' | 'pending_user_approval' | 'admitted' | 'paused' | 'revoked' | 'expired'
export type CapabilityMode = 'inspect' | 'propose' | 'execute'
export type ErrorCode =
  | 'ADMISSION_REQUIRED'
  | 'ADMISSION_PENDING'
  | 'ADMISSION_REVOKED'
  | 'ADMISSION_PAUSED'
  | 'ROLE_NOT_GRANTED'
  | 'CAPABILITY_NOT_GRANTED'
  | 'SURFACE_NOT_ASSIGNED'
  | 'STALE_STATE'
  | 'PERMISSION_DENIED'
  | 'CONSTRAINT_VIOLATION'
  | 'INVALID_OPERATION'
  | 'SURFACE_NOT_OWNED'
  | 'NOT_FOUND'

export interface ResponsiveProps {
  display?: 'block'|'flex'|'grid'|'none'
  direction?: 'row'|'column'
  gridColumns?: number
  gap?: number
  padding?: number
  margin?: number
  width?: 'auto'|'full'
  maxWidth?: number
  align?: 'start'|'center'|'end'|'stretch'
  textAlign?: 'left'|'center'|'right'
  fontSize?: number
  lineHeight?: number
  order?: number
  visible?: boolean
  imageRatio?: '16:9'|'4:3'|'1:1'
}

export interface ComponentProps {
  text?: string
  label?: string
  src?: string
  href?: string
  role?: string
  minTouchTarget?: number
}

export interface ComponentNode {
  id: string
  type: 'page'|'section'|'container'|'nav'|'text'|'image'|'button'|'grid'|'footer'
  name: string
  props: ComponentProps
  responsive: Partial<Record<Breakpoint, ResponsiveProps>>
  children: string[]
}

export interface Project { id:string; name:string; rootId:string; nodes:Record<string,ComponentNode> }
export interface SharedGoal { id:string; description:string; status:'active'|'paused'|'complete'; revision:number }
export interface AgentIdentity { id:string; displayName:string; provider?:string; sessionLabel?:string }
export interface CapabilityScope { resource:'project'|'breakpoint'; id?:string; mode:CapabilityMode }
export interface Capability { id:string; name:string; description:string; mode:CapabilityMode; resource:'project'|'breakpoint'; requiresApproval:boolean }
export interface AgentRole { id:string; name:string; description:string; defaultScopes:CapabilityScope[] }
export interface AgentAdmission {
  id:string
  agentIdentity:AgentIdentity
  status:AdmissionStatus
  requestedRoleId?:string
  requestedScopes:CapabilityScope[]
  grantedScopes:CapabilityScope[]
  reason?:string
  sessionId:string
  createdAt:number
  admittedAt?:number
  expiresAt?:number
}
export interface Participant { id:string; name:string; type:ParticipantType; color:'violet'|'blue'|'neutral'; status:'idle'|'working'|'paused'|'offline'; breakpoint?:Breakpoint; admissionId?:string }
export interface SurfaceAssignment { breakpoint:Breakpoint; participantId:string; mode:'read'|'edit'|'propose' }
export interface Constraint { id:string; type:string; label:string; enabled:boolean; config?:Record<string,number|string|boolean> }
export interface ActivityEvent { id:string; actorId:string; actorType:ParticipantType; message:string; kind:'selection'|'mutation'|'system'|'proposal'|'conflict'; timestamp:number; revision:number }
export interface SelectionState { componentId?:string; breakpoint?:Breakpoint; actorId?:string }
export interface OperationChange { componentId:string; breakpoint:Breakpoint; patch:ResponsiveProps; previous?:ResponsiveProps }
export interface OperationRecord { id:string; actorId:string; actorType:ParticipantType; label:string; revisionBefore:number; revisionAfter:number; changes:OperationChange[]; timestamp:number }
export interface Proposal { id:string; admissionId?:string; participantId:string; breakpoint:Breakpoint; baseRevision:number; operations:OperationChange[]; status:ProposalStatus; createdAt:number; explanation:string; affectedComponentIds:string[] }
export interface DomainError { ok:false; error:ErrorCode; message:string; expectedRevision?:number; currentRevision?:number; details?:Record<string,unknown> }
export interface DomainSuccess<T=undefined> { ok:true; revision:number; data?:T }
export type DomainResult<T=undefined> = DomainSuccess<T>|DomainError
