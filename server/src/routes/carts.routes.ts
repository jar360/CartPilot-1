
import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

export const cartsRouter = Router();

const recoveryStatusLabels: Record<string, string> = {
  Pending: 'Pending',
  MessageGenerated: 'Message generated',
  AwaitingApproval: 'Awaiting approval',
  Approved: 'Approved',
  Recovered: 'Recovered',
};

const toneLabels: Record<string, string> = {
  WarmReminder: 'Warm Reminder',
  GentleIncentive: 'Gentle Incentive',
  VIPConcierge: 'VIP Concierge',
};

const categoryLabels: Record<string, string> = {
  Serums: 'Serums',
  Moisturizers: 'Moisturizers',
  Cleansers: 'Cleansers',
  SunCare: 'Sun Care',
  Treatments: 'Treatments',
};

cartsRouter.get('/', async (_req, res) => {
  try {
    const carts = await prisma.cart.findMany({
      orderBy: { abandonedAt: 'desc' },
      include: {
        items: true,
      },
    });

    const result = carts.map((cart) => ({
      id: cart.id,
      customerId: cart.customerId,
      items: cart.items.map((item) => ({
        sku: item.sku,
        name: item.name,
        category: categoryLabels[item.category],
        variant: item.variant,
        unitPriceInr: item.unitPriceInr,
        quantity: item.quantity,
      })),
      abandonedHoursAgo: cart.abandonedHoursAgo,
      abandonedAtIso: cart.abandonedAt.toISOString(),
      recoveryStatus: recoveryStatusLabels[cart.recoveryStatus],
      channel: cart.channel,
      tone: toneLabels[cart.tone],
      generatedSubject: cart.generatedSubject ?? undefined,
      generatedMessage: cart.generatedMessage ?? undefined,
      lastActionNote: cart.lastActionNote ?? undefined,
      updatedAtIso: cart.updatedAt.toISOString(),
    }));

    res.status(200).json({
      success: true,
      count: result.length,
      data: result,
    });
  } catch (error) {
    console.error('Failed to fetch carts:', error);

    res.status(500).json({
      success: false,
      error: {
        code: 'CARTS_FETCH_FAILED',
        message: 'Unable to retrieve carts',
      },
    });
  }
});
