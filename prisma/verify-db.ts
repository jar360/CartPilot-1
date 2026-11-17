
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyDatabase() {
  try {
    console.log('Customers:', await prisma.customer.count());
    console.log('Carts:', await prisma.cart.count());
    console.log('Cart items:', await prisma.cartItem.count());
    console.log('Interactions:', await prisma.customerInteraction.count());
    console.log('Activity events:', await prisma.activityEvent.count());
    console.log('Recovery messages:', await prisma.recoveryMessage.count());
  } catch (error) {
    console.error('Database verification failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyDatabase();
