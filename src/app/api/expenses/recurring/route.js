import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const subscriptionId = searchParams.get('subscriptionId');
    
    if (!subscriptionId) {
      return NextResponse.json({ error: 'Missing subscriptionId parameter' }, { status: 400 });
    }
    
    const expenses = await prisma.expense.findMany({
      where: {
        inventoryId: subscriptionId,
        isDeleted: false
      },
      orderBy: {
        date: 'desc'
      }
    });
    
    return NextResponse.json(expenses);
  } catch (error) {
    console.error('Error fetching recurring expenses:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    
    // Validate required fields
    if (!data.amount || !data.date || !data.inventoryId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Create expense
    const expense = await prisma.expense.create({
      data: {
        category: data.category || 'Subscription',
        amount: parseFloat(data.amount),
        description: data.description || null,
        date: new Date(data.date),
        paymentProofLink: data.paymentProofLink || null,
        inventoryId: data.inventoryId,
        fundType: data.fundType || 'petty_cash',
        isRecurringExpense: data.isRecurringExpense || false,
        recurringFrequency: data.isRecurringExpense ? data.recurringFrequency : null,
        nextBillingDate: data.isRecurringExpense ? data.nextBillingDate : null,
        createdById: data.createdById || null
      }
    });
    
    return NextResponse.json(expense);
  } catch (error) {
    console.error('Error creating recurring expense:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Missing expense ID' }, { status: 400 });
    }
    
    // Soft delete expense
    const expense = await prisma.expense.update({
      where: {
        id
      },
      data: {
        isDeleted: true
      }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting recurring expense:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}