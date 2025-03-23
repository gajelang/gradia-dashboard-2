import { PrismaClient } from "@prisma/client";
import { verifyAuthToken } from "@/lib/auth";
import { createSafeResponse } from "@/lib/api";

const prisma = new PrismaClient();

// Function to handle GET requests
export async function GET(req) {
  // Verify auth token
  const { isAuthenticated, user } = await verifyAuthToken(req);
  
  if (!isAuthenticated) {
    return createSafeResponse({ error: "Unauthorized" }, 401);
  }
  
  try {
    // Ambil transaksi dengan expenses yang terkait
    const transactions = await prisma.transaction.findMany({
      orderBy: { date: 'desc' },
      include: {
        expenses: true, // Include related expenses
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
    
    // Modifikasi data transaksi untuk menambahkan capitalCost
    const transactionsWithCapitalCost = transactions.map(transaction => {
      // Hitung total biaya modal dari expenses
      const capitalCost = transaction.expenses.reduce(
        (total, expense) => total + (expense.amount || 0), 
        0
      );
      
      // Mengembalikan objek transaksi dengan capitalCost dan menghapus expenses
      // (karena kita tidak perlu mengirim seluruh data expense)
      const { expenses, ...transactionData } = transaction;
      
      return {
        ...transactionData,
        capitalCost
      };
    });
    
    return createSafeResponse(transactionsWithCapitalCost);
  } catch (error) {
    console.log("GET error:", String(error));
    return createSafeResponse({ error: "Failed to fetch transactions" }, 500);
  }
}

// Function to handle POST requests (creating a transaction)
export async function POST(req) {
  // Verify auth token
  const { isAuthenticated, user } = await verifyAuthToken(req);
  
  if (!isAuthenticated) {
    return createSafeResponse({ error: "Unauthorized" }, 401);
  }
  
  try {
    console.log("Incoming POST /api/transactions");
    
    // Parse request safely
    let data;
    try {
      data = await req.json();
      console.log("Data received:", data);
    } catch (error) {
      return createSafeResponse({ message: "Invalid request data" }, 400);
    }
    
    if (!data || !data.name) {
      return createSafeResponse({ message: "Missing required fields" }, 400);
    }

    // Create transaction with enhanced payment fields and user tracking
    let transaction;
    try {
      // Start with basic required fields
      const transactionData = {
        name: data.name,
        amount: Number(data.amount) || 0, // This is the amount that affects revenue
        status: data.paymentStatus || "Belum Bayar",
        paymentStatus: data.paymentStatus || "Belum Bayar", 
        description: data.description || "",
        date: data.date ? new Date(data.date) : new Date(),
        // Add user tracking data
        createdById: user.userId,
        updatedById: user.userId
      };
      
      // Add new financial fields if provided
      if (data.projectValue !== undefined) {
        transactionData.projectValue = Number(data.projectValue) || 0;
      }
      
      if (data.totalProfit !== undefined) {
        transactionData.totalProfit = Number(data.totalProfit) || 0;
      }
      
      if (data.downPaymentAmount !== undefined) {
        transactionData.downPaymentAmount = Number(data.downPaymentAmount) || 0;
      }
      
      if (data.remainingAmount !== undefined) {
        transactionData.remainingAmount = Number(data.remainingAmount) || 0;
      }
      
      // Add optional contact fields if provided
      if (data.email) {
        transactionData.email = data.email;
      }
      
      if (data.phone) {
        transactionData.phone = data.phone;
      }
      
      // Add optional broadcast date fields if provided
      if (data.startDate) {
        transactionData.startDate = new Date(data.startDate);
      }
      
      if (data.endDate) {
        transactionData.endDate = new Date(data.endDate);
      }
      
      // Add payment proof link if provided
      if (data.paymentProofLink) {
        transactionData.paymentProofLink = data.paymentProofLink;
      }
      
      console.log("Creating transaction with data:", transactionData);
      
      // Create transaction using prisma
      transaction = await prisma.transaction.create({ data: transactionData });
      console.log("Transaction created successfully:", transaction.id);
    } catch (dbError) {
      console.log("Database error:", String(dbError));
      return createSafeResponse({ 
        message: "Failed to create transaction", 
        details: String(dbError)
      }, 500);
    }

    // Update finances - only add the actual paid amount to the company finances
    try {
      let finance = await prisma.companyFinance.findFirst();
      const amountToAdd = Number(data.amount) || 0;
      
      if (finance) {
        await prisma.companyFinance.update({
          where: { id: finance.id },
          data: { totalFunds: finance.totalFunds + amountToAdd }
        });
        console.log("Company finance updated successfully, added:", amountToAdd);
      } else {
        await prisma.companyFinance.create({
          data: { totalFunds: amountToAdd }
        });
        console.log("Company finance created successfully with amount:", amountToAdd);
      }
    } catch (error) {
      console.log("Finance update issue:", String(error));
      // Continue even if finance update fails
    }

    return createSafeResponse({ transaction });
  } catch (error) {
    console.log("Unhandled error:", String(error));
    return createSafeResponse({ message: "Server error" }, 500);
  }
}

export async function PATCH(req) {
  // Verify auth token
  const { isAuthenticated, user } = await verifyAuthToken(req);
  
  if (!isAuthenticated) {
    return createSafeResponse({ error: "Unauthorized" }, 401);
  }
  
  try {
    let data = await req.json();
    const { id, paymentStatus, expenses, updatedById } = data || {};
    
    if (!id) {
      return createSafeResponse({ message: "Missing transaction ID" }, 400);
    }

    let transaction;
    try {
      // Prepare update data
      const updateData = { 
        status: paymentStatus || data.status || "Belum Bayar",
        paymentStatus: paymentStatus || data.status || "Belum Bayar",
        updatedById: updatedById || user.userId // Track who updated
      };
      
      // Add other fields to update if provided
      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.projectValue !== undefined) updateData.projectValue = Number(data.projectValue);
      if (data.totalProfit !== undefined) updateData.totalProfit = Number(data.totalProfit);
      if (data.email !== undefined) updateData.email = data.email;
      if (data.phone !== undefined) updateData.phone = data.phone;
      if (data.startDate !== undefined) updateData.startDate = data.startDate ? new Date(data.startDate) : null;
      if (data.endDate !== undefined) updateData.endDate = data.endDate ? new Date(data.endDate) : null;
      if (data.paymentProofLink !== undefined) updateData.paymentProofLink = data.paymentProofLink;
      
      // Update the transaction
      transaction = await prisma.transaction.update({
        where: { id },
        data: updateData
      });

      // Handle expenses if provided
      let createdExpenses = [];
      if (expenses && Array.isArray(expenses) && expenses.length > 0) {
        try {
          // Create each expense
          for (const expense of expenses) {
            // Create the expense data with creator tracking
            const expenseData = {
              category: expense.category,
              amount: Number(expense.amount),
              description: expense.description || null,
              date: new Date(expense.date),
              paymentProofLink: expense.paymentProofLink || null,
              transactionId: id // Link to the transaction
            };
            
            // Add creator information
            if (expense.createdById) {
              expenseData.createdById = expense.createdById;
              expenseData.updatedById = expense.createdById;
            } else {
              expenseData.createdById = user.userId;
              expenseData.updatedById = user.userId;
            }
            
            // Create the expense with user tracking
            const createdExpense = await prisma.expense.create({
              data: expenseData
            });
            
            createdExpenses.push(createdExpense);
            
            // Update company finances
            try {
              let finance = await prisma.companyFinance.findFirst();
              if (finance) {
                await prisma.companyFinance.update({
                  where: { id: finance.id },
                  data: {
                    totalFunds: finance.totalFunds - Number(expense.amount),
                  }
                });
                console.log(`Finance updated: subtracted ${expense.amount} for expense ID ${createdExpense.id}`);
              }
            } catch (financeError) {
              console.log("Finance update error during expense creation:", String(financeError));
              // Continue even if finance update fails
            }
          }
          
          console.log(`Created ${createdExpenses.length} expenses for transaction ID ${id}`);
        } catch (expenseError) {
          console.log("Error creating expenses:", String(expenseError));
          // Continue even if expenses creation fails
        }
      }
      
      return createSafeResponse({ 
        transaction, 
        expenses: createdExpenses 
      });
    } catch (error) {
      console.log("Update error:", String(error));
      return createSafeResponse({ message: "Failed to update transaction" }, 500);
    }
  } catch (error) {
    console.log("PATCH error:", String(error));
    return createSafeResponse({ message: "Server error" }, 500);
  }
}

export async function DELETE(req) {
  // Verify auth token
  const { isAuthenticated, user } = await verifyAuthToken(req);
  
  if (!isAuthenticated) {
    return createSafeResponse({ error: "Unauthorized" }, 401);
  }
  
  try {
    const { id } = await req.json();
    
    if (!id) {
      return createSafeResponse({ message: "Transaction ID required" }, 400);
    }

    let transaction;
    try {
      transaction = await prisma.transaction.findUnique({ where: { id } });
      
      if (!transaction) {
        return createSafeResponse({ message: "Transaction not found" }, 404);
      }
      
      // Find all related expenses to update finances
      const relatedExpenses = await prisma.expense.findMany({
        where: { transactionId: id }
      });
      
      // Delete related expenses first
      if (relatedExpenses.length > 0) {
        await prisma.expense.deleteMany({
          where: { transactionId: id }
        });
        console.log(`Deleted ${relatedExpenses.length} expenses for transaction ID ${id}`);
      }
      
      // Then delete the transaction
      await prisma.transaction.delete({ where: { id } });
    } catch (error) {
      console.log("Delete error:", String(error));
      return createSafeResponse({ message: "Failed to delete transaction" }, 500);
    }

    // Update finances - subtract the amount that was added to revenue
    try {
      const finance = await prisma.companyFinance.findFirst();
      if (finance) {
        const amountToSubtract = transaction.amount || 0;
        await prisma.companyFinance.update({
          where: { id: finance.id },
          data: { totalFunds: finance.totalFunds - amountToSubtract }
        });
      }
    } catch (error) {
      // Continue even if finance update fails
      console.log("Finance update error during deletion:", error);
    }

    return createSafeResponse({ message: "Transaction deleted" });
  } catch (error) {
    console.log("DELETE error:", String(error));
    return createSafeResponse({ message: "Server error" }, 500);
  }
}