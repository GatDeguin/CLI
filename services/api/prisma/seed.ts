import {
  CoverageStatus,
  FamilyPermissionType,
  IntegrationAttemptStatus,
  PaymentStatus,
  PrismaClient,
  ProfileType,
  WebhookProcessingStatus
} from '@prisma/client';
import { pbkdf2Sync, randomBytes } from 'node:crypto';

const prisma = new PrismaClient();

const VALID_FROM = new Date('2026-01-01T00:00:00Z');


const hashPassword = (password: string): string => {
  const salt = randomBytes(16).toString('hex');
  const hash = pbkdf2Sync(password, salt, 10_000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
};

async function main() {
  const plans = await prisma.$transaction([
    prisma.coveragePlan.upsert({
      where: { code: 'PART' },
      update: { name: 'Particular', includesCopay: false, validFrom: VALID_FROM, validTo: null },
      create: {
        code: 'PART',
        name: 'Particular',
        includesCopay: false,
        validFrom: VALID_FROM
      }
    }),
    prisma.coveragePlan.upsert({
      where: { code: 'TOTAL' },
      update: { name: 'Cobertura Total', includesCopay: false, validFrom: VALID_FROM, validTo: null },
      create: {
        code: 'TOTAL',
        name: 'Cobertura Total',
        includesCopay: false,
        validFrom: VALID_FROM
      }
    }),
    prisma.coveragePlan.upsert({
      where: { code: 'COPAY' },
      update: { name: 'Plan Copago', includesCopay: true, validFrom: VALID_FROM, validTo: null },
      create: {
        code: 'COPAY',
        name: 'Plan Copago',
        includesCopay: true,
        validFrom: VALID_FROM
      }
    })
  ]);

  const specialties = await prisma.$transaction([
    prisma.specialty.upsert({
      where: { code: 'CLN' },
      update: { name: 'Clínica' },
      create: { code: 'CLN', name: 'Clínica' }
    }),
    prisma.specialty.upsert({
      where: { code: 'PED' },
      update: { name: 'Pediatría' },
      create: { code: 'PED', name: 'Pediatría' }
    })
  ]);


  const adminUsers = [
    { email: 'superadmin@demo.local', dni: '39999111', fullName: 'Ana Superadmin', role: 'ADMIN' as const, password: 'admin1234' },
    { email: 'administrador@demo.local', dni: '39999444', fullName: 'Carla Administradora', role: 'ADMIN' as const, password: 'administrador1234' },
    { email: 'operador@demo.local', dni: '39999222', fullName: 'Luis Operador', role: 'USER' as const, password: 'operador1234' },
    { email: 'auditor@demo.local', dni: '39999333', fullName: 'Alicia Auditora', role: 'AUDITOR' as const, password: 'auditor1234' }
  ];

  for (const admin of adminUsers) {
    const user = await prisma.appUser.upsert({
      where: { email: admin.email },
      update: {
        dni: admin.dni,
        fullName: admin.fullName,
        role: admin.role,
        profile: ProfileType.PARTICULAR
      },
      create: {
        email: admin.email,
        dni: admin.dni,
        fullName: admin.fullName,
        role: admin.role,
        profile: ProfileType.PARTICULAR
      }
    });

    await prisma.authCredential.upsert({
      where: { userId: user.id },
      update: { passwordHash: hashPassword(admin.password), passwordUpdated: new Date() },
      create: { userId: user.id, passwordHash: hashPassword(admin.password) }
    });
  }

  const profiles = [
    { profile: ProfileType.PARTICULAR, dni: '30111222', fullName: 'Sofía Particular', email: 'particular@demo.local' },
    { profile: ProfileType.TOTAL_COVERAGE, dni: '30222333', fullName: 'Nicolás Cobertura Total', email: 'total@demo.local' },
    { profile: ProfileType.COPAY, dni: '30333444', fullName: 'Ana Copago', email: 'copago@demo.local' },
    { profile: ProfileType.PENDING_COVERAGE, dni: '30444555', fullName: 'Martín Cobertura Pendiente', email: 'pendiente@demo.local' },
    { profile: ProfileType.TUTOR_DEPENDENT, dni: '30555666', fullName: 'Laura Tutor', email: 'tutor@demo.local', isTutor: true }
  ];

  const seededPatients = new Map<ProfileType, { userId: string; patientId: string; dni: string }>();

  for (const person of profiles) {
    const user = await prisma.appUser.upsert({
      where: { email: person.email },
      update: {
        dni: person.dni,
        fullName: person.fullName,
        profile: person.profile,
        isTutor: person.isTutor ?? false
      },
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
      update: {
        fullName: person.fullName,
        userId: user.id,
        birthDate: new Date('1990-01-01T00:00:00Z')
      },
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
      update: {
        status: person.profile === ProfileType.PENDING_COVERAGE ? CoverageStatus.PENDING : CoverageStatus.ACTIVE,
        validFrom: VALID_FROM,
        validTo: null
      },
      create: {
        patientId: patient.id,
        planId: plan.id,
        memberNumber: `M-${person.dni}`,
        status: person.profile === ProfileType.PENDING_COVERAGE ? CoverageStatus.PENDING : CoverageStatus.ACTIVE,
        validFrom: VALID_FROM
      }
    });

    await prisma.payment.upsert({
      where: { providerPaymentId: `demo-payment-${person.dni}` },
      update: {
        patientId: patient.id,
        appointmentId: null,
        amount: person.profile === ProfileType.COPAY ? 3500 : person.profile === ProfileType.PARTICULAR ? 22000 : 0,
        status: person.profile === ProfileType.PENDING_COVERAGE ? PaymentStatus.PENDING : PaymentStatus.APPROVED,
        externalReference: `ORDER-${person.dni}`
      },
      create: {
        providerPaymentId: `demo-payment-${person.dni}`,
        patientId: patient.id,
        appointmentId: null,
        amount: person.profile === ProfileType.COPAY ? 3500 : person.profile === ProfileType.PARTICULAR ? 22000 : 0,
        status: person.profile === ProfileType.PENDING_COVERAGE ? PaymentStatus.PENDING : PaymentStatus.APPROVED,
        externalReference: `ORDER-${person.dni}`
      }
    });

    const document = await prisma.document.create({
      data: {
        patientId: patient.id,
        appointmentId: null,
        type: 'RESULTADO_LABORATORIO',
        url: `https://cdn.demo.local/documents/${person.dni}/resultado-v1.pdf`,
        publishedAt: new Date('2026-02-10T14:00:00Z')
      }
    }).catch(async () => {
      const existing = await prisma.document.findFirst({
        where: { patientId: patient.id, type: 'RESULTADO_LABORATORIO' },
        orderBy: { createdAt: 'desc' }
      });
      if (!existing) {
        throw new Error(`Unable to seed document for ${person.dni}`);
      }
      return existing;
    });

    const version = await prisma.documentVersion.upsert({
      where: {
        documentId_versionNumber: {
          documentId: document.id,
          versionNumber: 1
        }
      },
      update: {
        storageUrl: `s3://demo-bucket/documents/${person.dni}/resultado-v1.pdf`,
        previewUrl: `s3://demo-bucket/previews/${person.dni}/resultado-v1.jpg`,
        thumbnailUrl: `s3://demo-bucket/thumbnails/${person.dni}/resultado-v1.jpg`,
        checksumSha256: `sha256-${person.dni}-v1`,
        mimeType: 'application/pdf',
        status: 'ACTIVE',
        validFrom: new Date('2026-02-10T14:00:00Z'),
        validTo: null,
        createdByUserId: user.id
      },
      create: {
        documentId: document.id,
        versionNumber: 1,
        storageUrl: `s3://demo-bucket/documents/${person.dni}/resultado-v1.pdf`,
        previewUrl: `s3://demo-bucket/previews/${person.dni}/resultado-v1.jpg`,
        thumbnailUrl: `s3://demo-bucket/thumbnails/${person.dni}/resultado-v1.jpg`,
        checksumSha256: `sha256-${person.dni}-v1`,
        mimeType: 'application/pdf',
        status: 'ACTIVE',
        validFrom: new Date('2026-02-10T14:00:00Z'),
        createdByUserId: user.id
      }
    });

    await prisma.documentAccessAudit.create({
      data: {
        documentId: document.id,
        documentVersionId: version.id,
        patientId: patient.id,
        accessedByUserId: user.id,
        action: 'VIEW',
        channel: 'PATIENT_APP',
        ipAddress: '10.20.30.40',
        userAgent: 'DemoMobile/1.0'
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

    seededPatients.set(person.profile, { userId: user.id, patientId: patient.id, dni: person.dni });
  }

  const tutor = await prisma.appUser.findUniqueOrThrow({ where: { email: 'tutor@demo.local' } });
  const dependent = await prisma.patient.upsert({
    where: { dni: '40666777' },
    update: { dependentOfUserId: tutor.id, userId: tutor.id, fullName: 'Mateo Dependiente' },
    create: {
      userId: tutor.id,
      dependentOfUserId: tutor.id,
      dni: '40666777',
      fullName: 'Mateo Dependiente',
      birthDate: new Date('2016-06-10T00:00:00Z')
    }
  });

  await prisma.familyPermission.deleteMany({ where: { tutorUserId: tutor.id, dependentPatientId: dependent.id } });
  await prisma.familyPermission.createMany({
    data: [
      {
        tutorUserId: tutor.id,
        dependentPatientId: dependent.id,
        grantedByUserId: tutor.id,
        permissionType: FamilyPermissionType.DOCUMENTS,
        validFrom: new Date('2026-01-01T00:00:00Z'),
        validTo: null,
        notes: 'Acceso para descargar estudios'
      },
      {
        tutorUserId: tutor.id,
        dependentPatientId: dependent.id,
        grantedByUserId: tutor.id,
        permissionType: FamilyPermissionType.SCHEDULING,
        validFrom: new Date('2026-01-01T00:00:00Z'),
        validTo: null,
        notes: 'Gestión de turnos pediátricos'
      }
    ]
  });

  await prisma.coverageMatrixRule.deleteMany({ where: { practiceCode: { in: ['CONSULTA_GENERAL', 'CONSULTA_PEDIATRIA'] } } });
  await prisma.coverageMatrixRule.createMany({
    data: [
      {
        coveragePlanId: plans[1].id,
        specialtyId: specialties[0].id,
        siteCode: 'CABA-CENTRAL',
        practiceCode: 'CONSULTA_GENERAL',
        resolution: { covered: true, copay: 0 },
        validFrom: new Date('2026-01-01T00:00:00Z')
      },
      {
        coveragePlanId: plans[2].id,
        specialtyId: specialties[0].id,
        siteCode: 'CABA-CENTRAL',
        practiceCode: 'CONSULTA_GENERAL',
        resolution: { covered: true, copay: 3500 },
        validFrom: new Date('2026-01-01T00:00:00Z')
      },
      {
        coveragePlanId: plans[1].id,
        specialtyId: specialties[1].id,
        siteCode: 'CABA-PEDIATRIA',
        practiceCode: 'CONSULTA_PEDIATRIA',
        resolution: { covered: true, copay: 0 },
        validFrom: new Date('2026-01-01T00:00:00Z')
      }
    ]
  });

  await prisma.economicRule.deleteMany({ where: { conceptCode: { in: ['CONSULTA', 'ESTUDIO_BAJO_COSTO'] } } });
  await prisma.economicRule.createMany({
    data: [
      {
        coveragePlanId: plans[0].id,
        profile: ProfileType.PARTICULAR,
        conceptCode: 'CONSULTA',
        copayAmount: 22000,
        reimbursementPct: 0,
        validFrom: new Date('2026-01-01T00:00:00Z')
      },
      {
        coveragePlanId: plans[2].id,
        profile: ProfileType.COPAY,
        conceptCode: 'CONSULTA',
        copayAmount: 3500,
        reimbursementPct: 80,
        validFrom: new Date('2026-01-01T00:00:00Z')
      },
      {
        coveragePlanId: plans[1].id,
        profile: ProfileType.TOTAL_COVERAGE,
        conceptCode: 'ESTUDIO_BAJO_COSTO',
        copayAmount: 0,
        reimbursementPct: 100,
        validFrom: new Date('2026-01-01T00:00:00Z')
      }
    ]
  });

  await prisma.businessRule.deleteMany({ where: { ruleCode: { in: ['AGE_REQUIRES_TUTOR', 'BLOCK_DEBTOR_SCHEDULING'] } } });
  await prisma.businessRule.createMany({
    data: [
      {
        domain: 'SCHEDULING',
        ruleCode: 'AGE_REQUIRES_TUTOR',
        description: 'Menores de 18 requieren tutor activo',
        priority: 10,
        condition: { ltAge: 18 },
        outcome: { requireFamilyPermission: true },
        validFrom: new Date('2026-01-01T00:00:00Z')
      },
      {
        domain: 'PAYMENTS',
        ruleCode: 'BLOCK_DEBTOR_SCHEDULING',
        description: 'Bloquea turnos con deuda vencida',
        priority: 20,
        condition: { hasDebtOverDays: 30 },
        outcome: { blockScheduling: true },
        validFrom: new Date('2026-01-01T00:00:00Z')
      }
    ]
  });

  const admin = seededPatients.get(ProfileType.TOTAL_COVERAGE);
  if (admin) {
    const coverageRules = await prisma.coverageMatrixRule.findMany({
      where: { practiceCode: { in: ['CONSULTA_GENERAL', 'CONSULTA_PEDIATRIA'] } },
      orderBy: { createdAt: 'asc' }
    });
    const economicRules = await prisma.economicRule.findMany({
      where: { conceptCode: { in: ['CONSULTA', 'ESTUDIO_BAJO_COSTO'] } },
      orderBy: { createdAt: 'asc' }
    });
    const businessRules = await prisma.businessRule.findMany({
      where: { ruleCode: { in: ['AGE_REQUIRES_TUTOR', 'BLOCK_DEBTOR_SCHEDULING'] } },
      orderBy: { createdAt: 'asc' }
    });
    const audits = [];
    if (coverageRules[0]) {
      audits.push({
        coverageMatrixRuleId: coverageRules[0].id,
        changedByUserId: admin.userId,
        action: 'CREATE',
        afterSnapshot: { source: 'seed', resolution: { covered: true, copay: 0 } }
      });
    }
    if (economicRules[0]) {
      audits.push({
        economicRuleId: economicRules[0].id,
        changedByUserId: admin.userId,
        action: 'CREATE',
        afterSnapshot: { source: 'seed', copayAmount: 22000 }
      });
    }
    if (businessRules[0]) {
      audits.push({
        businessRuleId: businessRules[0].id,
        changedByUserId: admin.userId,
        action: 'CREATE',
        afterSnapshot: { source: 'seed', requireFamilyPermission: true }
      });
    }
    if (audits.length > 0) {
      await prisma.ruleAudit.createMany({ data: audits });
    }
  }

  const integration = await prisma.integrationAttempt.create({
    data: {
      provider: 'MERCADO_PAGO',
      operation: 'PAYMENT_STATUS_SYNC',
      correlationId: 'seed-corr-payment-sync-001',
      requestBody: { paymentId: 'demo-payment-30333444' },
      responseBody: { status: 'approved' },
      statusCode: 200,
      status: IntegrationAttemptStatus.SUCCESS,
      attemptedAt: new Date('2026-03-01T10:00:00Z'),
      completedAt: new Date('2026-03-01T10:00:01Z')
    }
  });

  await prisma.webhookEvent.upsert({
    where: { idempotencyKey: 'seed-webhook-mp-evt-001' },
    update: {
      provider: 'MERCADO_PAGO',
      eventType: 'payment.updated',
      providerEventId: 'mp_evt_001',
      payload: { paymentId: 'demo-payment-30333444', status: 'approved' },
      status: WebhookProcessingStatus.PROCESSED,
      receivedAt: new Date('2026-03-01T10:00:02Z'),
      processedAt: new Date('2026-03-01T10:00:03Z'),
      integrationAttemptId: integration.id
    },
    create: {
      idempotencyKey: 'seed-webhook-mp-evt-001',
      provider: 'MERCADO_PAGO',
      eventType: 'payment.updated',
      providerEventId: 'mp_evt_001',
      payload: { paymentId: 'demo-payment-30333444', status: 'approved' },
      status: WebhookProcessingStatus.PROCESSED,
      receivedAt: new Date('2026-03-01T10:00:02Z'),
      processedAt: new Date('2026-03-01T10:00:03Z'),
      integrationAttemptId: integration.id
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
