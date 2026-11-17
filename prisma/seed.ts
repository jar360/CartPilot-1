
import { PrismaClient } from '@prisma/client';
import {
  INITIAL_CUSTOMERS,
  INITIAL_ABANDONED_CARTS,
} from '../src/data/mockData';

const prisma = new PrismaClient();

// Convert the labels used by the frontend into Prisma enum values.
const purchaseStatusMap = {
  Abandoned: 'Abandoned',
  'At Checkout': 'AtCheckout',
  Recovered: 'Recovered',
  Converted: 'Converted',
} as const;

const recoveryStatusMap = {
  Pending: 'Pending',
  'Message generated': 'MessageGenerated',
  'Awaiting approval': 'AwaitingApproval',
  Approved: 'Approved',
  Recovered: 'Recovered',
} as const;

const categoryMap = {
  Serums: 'Serums',
  Moisturizers: 'Moisturizers',
  Cleansers: 'Cleansers',
  'Sun Care': 'SunCare',
  Treatments: 'Treatments',
} as const;

const channelMap = {
  'Web Store': 'WebStore',
  Email: 'Email',
  WhatsApp: 'WhatsApp',
  'System Review': 'SystemReview',
} as const;

const toneMap = {
  'Warm Reminder': 'WarmReminder',
  'Gentle Incentive': 'GentleIncentive',
  'VIP Concierge': 'VIPConcierge',
} as const;

// Convert timestamps such as "2026-11-16 07:10 IST" into Date objects.
function parseInteractionDate(timestamp: string): Date {
  const value = timestamp
    .replace(' IST', '')
    .replace(' ', 'T');

  return new Date(`${value}:00+05:30`);
}

// Activity timeline timestamps are relative labels such as "2 hours ago".
function parseRelativeDate(
  label: string,
  referenceDate: Date,
): Date {
  const match = label.match(/(\d+)\s+(minute|hour|day)s?\s+ago/i);

  if (!match) {
    return referenceDate;
  }

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();

  const milliseconds =
    unit === 'minute'
      ? amount * 60 * 1000
      : unit === 'hour'
        ? amount * 60 * 60 * 1000
        : amount * 24 * 60 * 60 * 1000;

  return new Date(referenceDate.getTime() - milliseconds);
}
function getActivityEventType(event: string) {
  switch (event) {
    case 'Exited at Payment Page':
    case 'Paused at Shipping Details':
    case 'Abandoned at Shipping Details':
    case 'Left Payment Page':
    case 'Exited after Cart Review':
      return 'CHECKOUT_ABANDONED';

    case 'Applied shipping address':
    case 'Saved Hyderabad address':
      return 'ADDRESS_UPDATED';

    case 'Compared 3 brightening serums':
      return 'PRODUCT_COMPARED';

    case 'Viewed Barrier Repair Cream':
      return 'PRODUCT_VIEWED';

    case 'Updated cart quantity':
    case 'Added Hyaluronic Serum':
      return 'CART_UPDATED';

    case 'Viewed Cart Drawer':
      return 'CART_VIEWED';

    case 'Tested promo code field':
      return 'PROMO_CODE_ATTEMPTED';

    case 'Order Confirmed (#VG-4920)':
      return 'ORDER_RECOVERED';

    case 'Order Confirmed (#VG-4918)':
    case 'Direct Checkout Completed':
      return 'ORDER_COMPLETED';

    default:
      throw new Error(`Unknown activity event: ${event}`);
  }
}

async function seed() {
  console.log('Starting CartPilot database seed...');

  // WARNING: This resets existing demo customer data before reseeding.
  await prisma.customer.deleteMany();

  // First, insert customers and their related activity.
  for (const customer of INITIAL_CUSTOMERS) {
    const lastActivityAt = new Date(customer.lastActivityIso);

    await prisma.customer.create({
      data: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        city: customer.city,
        skinProfile: customer.skinProfile,
        purchaseStatus: purchaseStatusMap[customer.purchaseStatus],
        intent: customer.intent,
        lastActivityAt,
        sessionsLast7Days: customer.sessionsLast7Days,
        productViewsLast7Days: customer.productViewsLast7Days,
        previousOrders: customer.previousOrders,
        lifetimeValueInr: customer.lifetimeValueInr,
        checkoutStepReached: customer.checkoutStepReached,
        abandonedHoursAgo: customer.abandonedHoursAgo,

        interactions: {
          create: customer.interactions.map((interaction) => ({
            id: interaction.id,
            timestamp: parseInteractionDate(interaction.timestamp),
            channel: channelMap[interaction.channel],
            summary: interaction.summary,
            outcome: interaction.outcome,
          })),
        },

        activityEvents: {
          create: customer.activityTimeline.map((activity) => ({
            id: activity.id,
            timestamp: parseRelativeDate(
              activity.timestamp,
              lastActivityAt,
            ),
            eventType: getActivityEventType(activity.event),
            event: activity.event,
            detail: activity.detail,
          })),
        },
      },
    });
  }

  // Next, insert carts, their products, and any generated messages.
  for (const cart of INITIAL_ABANDONED_CARTS) {
    await prisma.cart.create({
      data: {
        id: cart.id,
        customerId: cart.customerId,
        abandonedAt: new Date(cart.abandonedAtIso),
        abandonedHoursAgo: cart.abandonedHoursAgo,
        recoveryStatus: recoveryStatusMap[cart.recoveryStatus],
        channel: cart.channel,
        tone: toneMap[cart.tone],
        generatedSubject: cart.generatedSubject,
        generatedMessage: cart.generatedMessage,
        lastActionNote: cart.lastActionNote,
        updatedAt: new Date(cart.updatedAtIso),

        items: {
          create: cart.items.map((item) => ({
            sku: item.sku,
            name: item.name,
            category: categoryMap[item.category],
            variant: item.variant,
            unitPriceInr: item.unitPriceInr,
            quantity: item.quantity,
          })),
        },

        messages: cart.generatedMessage
          ? {
              create: {
                channel: cart.channel,
                tone: toneMap[cart.tone],
                subject: cart.generatedSubject,
                body: cart.generatedMessage,
                provider: 'demo-seed',
                status: cart.recoveryStatus,
                approvedAt:
                  cart.recoveryStatus === 'Approved'
                    ? new Date(cart.updatedAtIso)
                    : null,
                sentAt:
                  cart.recoveryStatus === 'Recovered'
                    ? new Date(cart.updatedAtIso)
                    : null,
              },
            }
          : undefined,
      },
    });
  }

  console.log(`Seeded ${INITIAL_CUSTOMERS.length} customers.`);
  console.log(`Seeded ${INITIAL_ABANDONED_CARTS.length} carts.`);
  console.log('CartPilot database seed completed successfully.');
}

seed()
  .catch((error) => {
    console.error('Database seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
