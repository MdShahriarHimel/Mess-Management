# Project Architectural Rules

## Global Multi-Tenant Rule

When implementing any feature, preserve the multi-tenant architecture.

No feature may accidentally expose, share, overwrite, or modify another mess's:
* Data
* Settings
* Permissions
* Appearance
* AI Dictionary
* Translation Matrix
* Reports
* Statistics
* Assets
* Configurations

Every business resource must always be scoped to exactly one mess unless it is explicitly marked as a platform-wide resource.

Platform-wide resources may only be created, modified, or managed by the Platform Owner.

Never assume there is only one mess.
Never assume there is only one administrator.

All future modules must follow this architecture. This refinement only strengthens the permission and tenant isolation architecture without modifying any existing working functionality.
