import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/lib/prisma'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Fetch company finance record
    const financeData = await prisma.companyFinance.findFirst();
    
    if (!financeData) {
      // If no finance record exists, create one and return its value
      await prisma.companyFinance.create({
        data: { totalFunds: 0 }
      });
      
      return res.status(200).json({ totalFunds: 0 });
    }

    res.status(200).json({ totalFunds: financeData.totalFunds });
  } catch (error) {
    console.error('Error fetching total funds:', error);
    res.status(500).json({ error: 'Failed to fetch total funds' });
  }
}