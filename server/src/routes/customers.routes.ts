
import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

export const customersRouter = Router();

const purchaseStatusLabels: Record<string, string> = {
  Abandoned: 'Abandoned',
  AtCheckout: 'At Checkout',
  Recovered: 'Recovered',
  Converted: 'Converted',
};

const categoryLabels: Record<string, string> = {
  Serums: 'Serums',
  Moisturizers: 'Moisturizers',
  Cleansers: 'Cleansers',
  SunCare: 'Sun Care',
  Treatments: 'Treatments',
};

const channelLabels: Record<string, string> = {
  WebStore: 'Web Store',
  Email: 'Email',
  WhatsApp: 'WhatsApp',
  SystemReview: 'System Review',
};

function getRelativeTime(date: Date): string {
  const minutes = Math.max(
    0,
    Math.floor((Date.now() - date.getTime()) / 60000),
  );

  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  }

  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

customersRouter.get('/', async (_req, res) => {
  try {
    const customers = await prisma.customer.findMany({
      orderBy: {
        lastActivityAt: 'desc',
      },
      include: {
        carts: {
          orderBy: {
            abandonedAt: 'desc',
          },
          take: 1,
          include: {
            items: true,
          },
        },
        interactions: {
          orderBy: {
            timestamp: 'desc',
          },
        },
        activityEvents: {
          select: {
    id: true,
    customerId: true,
    timestamp: true,
    event: true,
    detail: true,
    eventType: true,
  },
          orderBy: {
            timestamp: 'desc',
          },
        },
      },
    });

    const result = customers.map((customer) => {
      const latestCart = customer.carts[0];

      return {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        city: customer.city,
        skinProfile: customer.skinProfile,

        purchaseStatus:
          purchaseStatusLabels[customer.purchaseStatus],

        intent: customer.intent,

        lastActivityIso: customer.lastActivityAt.toISOString(),
        lastActivityLabel: getRelativeTime(customer.lastActivityAt),

        sessionsLast7Days: customer.sessionsLast7Days,
        productViewsLast7Days: customer.productViewsLast7Days,
        previousOrders: customer.previousOrders,
        lifetimeValueInr: customer.lifetimeValueInr,
        checkoutStepReached: customer.checkoutStepReached,
        abandonedHoursAgo: customer.abandonedHoursAgo,

        cartItems: (latestCart?.items ?? []).map((item) => ({
          sku: item.sku,
          name: item.name,
          category: categoryLabels[item.category],
          variant: item.variant,
          unitPriceInr: item.unitPriceInr,
          quantity: item.quantity,
        })),

        interactions: customer.interactions.map((interaction) => ({
          id: interaction.id,
          timestamp: interaction.timestamp.toISOString(),
          channel: channelLabels[interaction.channel],
          summary: interaction.summary,
          outcome: interaction.outcome ?? undefined,
        })),

        activityTimeline: customer.activityEvents.map((activity) => ({
           id: activity.id,
           timestamp: activity.timestamp.toISOString(),
           event: activity.event,
           detail: activity.detail,
           eventType: activity.eventType,
         })),
      };
    });

    res.status(200).json({
      success: true,
      count: result.length,
      data: result,
    });
  } catch (error) {
    console.error('Failed to fetch customers:', error);

    res.status(500).json({
      success: false,
      error: {
        code: 'CUSTOMERS_FETCH_FAILED',
        message: 'Unable to retrieve customers',
      },
    });
  }
});
