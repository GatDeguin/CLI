# ADR-0001: Arquitectura modular monorepo

## Estado
Aceptado.

## Contexto
Se requiere evolucionar producto mobile + web + API + worker compartiendo tipos y convenciones.

## Decisión
Adoptar monorepo con apps, services y packages; backend NestJS modular por dominio.

## Consecuencias
- + Reuso de librerías y estándares.
- + Evolución coordinada de contratos.
- - Mayor costo de gobernanza CI/CD.
