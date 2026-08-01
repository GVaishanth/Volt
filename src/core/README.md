# Core Layer (`@core/*`)

Houses foundational infrastructure modules required across the application lifecycle:

- `VoltBus`: The event pub/sub broker guaranteeing strict module decoupling.
- `AppController`: The root boot sequence and system initialization controller.
- `Constants`: Global enums, storage quotas, and default configurations.
