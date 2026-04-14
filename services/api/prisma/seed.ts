import { PrismaClient, ProfileType, CoverageStatus, AppointmentStatus, PaymentStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const plans = await prisma.$transaction([
    prisma.coveragePlan.upsert({
      where: { code: 'PART' },
      update: {},
      create: {
        code: 'PART',
        name: 'Particular',
        includesCopay: false,
        validFrom: new Date('2026-01-01T00:00:00Z')
      }
    }),
    prisma.coveragePlan.upsert({
      where: { code: 'TOTAL' },
      update: {},
      create: {
        code: 'TOTAL',
        name: 'Cobertura Total',
        includesCopay: false,
        validFrom: new Date('2026-01-01T00:00:00Z')
      }
    }),
    prisma.coveragePlan.upsert({
      where: { code: 'COPAY' },
      update: {},
      create: {
        code: 'COPAY',
        name: 'Plan Copago',
        includesCopay: true,
        validFrom: new Date('2026-01-01T00:00:00Z')
      }
    })
  ]);

  const profiles = [
    { profile: ProfileType.PARTICULAR, dni: '30111222', fullName: 'Sofía Particular', email: 'particular@demo.local' },
    { profile: ProfileType.TOTAL_COVERAGE, dni: '30222333', fullName: 'Nicolás Cobertura Total', email: 'total@demo.local' },
    { profile: ProfileType.COPAY, dni: '30333444', fullName: 'Ana Copago', email: 'copago@demo.local' },
    { profile: ProfileType.PENDING_COVERAGE, dni: '30444555', fullName: 'Martín Cobertura Pendiente', email: 'pendiente@demo.local' },
    { profile: ProfileType.TUTOR_DEPENDENT, dni: '30555666', fullName: 'Laura Tutor', email: 'tutor@demo.local', isTutor: true }
  ];

  for (const person of profiles) {
    const user = await prisma.appUser.upsert({
      where: { email: person.email },
      update: { profile: person.profile },
      create: {
        email: person.email,
        dni: person.dni,
        fullName: person.fullName,
        profile: person.profile,
        isTutor: person.isTutor ?? false
      }
    });

    const patient = await prisma.patient.upsert({
      where: { dni: person.dni },
      update: {},
      create: {
        userId: user.id,
        dni: person.dni,
        fullName: person.fullName,
        birthDate: new Date('1990-01-01T00:00:00Z')
      }
    });

    const plan =
      person.profile === ProfileType.TOTAL_COVERAGE
        ? plans[1]
        : person.profile === ProfileType.COPAY
          ? plans[2]
          : plans[0];

    await prisma.coverage.upsert({
      where: {
        patientId_planId_memberNumber: {
          patientId: patient.id,
          planId: plan.id,
          memberNumber: `M-${person.dni}`
        }
      },
      update: { status: person.profile === ProfileType.PENDING_COVERAGE ? CoverageStatus.PENDING : CoverageStatus.ACTIVE },
      create: {
        patientId: patient.id,
        planId: plan.id,
        memberNumber: `M-${person.dni}`,
        status: person.profile === ProfileType.PENDING_COVERAGE ? CoverageStatus.PENDING : CoverageStatus.ACTIVE,
        validFrom: new Date('2026-01-01T00:00:00Z')
      }
    });

    await prisma.payment.create({
      data: {
        patientId: patient.id,
        amount: person.profile === ProfileType.COPAY ? 2500 : 0,
        status: person.profile === ProfileType.PENDING_COVERAGE ? PaymentStatus.PENDING : PaymentStatus.APPROVED
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'SEED_PROFILE_CREATED',
        entity: 'Patient',
        entityId: patient.id,
        payload: { profile: person.profile }
      }
    });
  }

  const tutor = await prisma.appUser.findUniqueOrThrow({ where: { email: 'tutor@demo.local' } });
  await prisma.patient.upsert({
    where: { dni: '40666777' },
    update: { dependentOfUserId: tutor.id },
    create: {
      userId: tutor.id,
      dependentOfUserId: tutor.id,
      dni: '40666777',
      fullName: 'Mateo Dependiente',
      birthDate: new Date('2016-06-10T00:00:00Z')
    }
  });
}

void main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
