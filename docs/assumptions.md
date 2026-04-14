# Assumptions

1. Los endpoints listados en docs representan el contrato objetivo de MVP+.
2. La app móvil opera con identidad unificada (AppUser) y contexto de paciente activo.
3. Pagos de copago se canalizan por un PSP externo con webhook firmado.
4. Resultados/documentos se almacenan fuera de DB y se referencian por URL segura.
5. Se dispone de Redis para colas y PostgreSQL para dominio transaccional.
6. El RBAC de Admin Web es obligatorio para cualquier mutación operativa.
7. La trazabilidad por `x-correlation-id` es requisito transversal.
