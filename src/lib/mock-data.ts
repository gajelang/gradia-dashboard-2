// lib/mock-data.ts

export interface Transaction {
  id: string
  amount: number
  status: string
  email: string
  name: string
  description: string
  date: string
}

// Sample transaction data
export const transactions: Transaction[] = [
  {
    id: "1",
    amount: 250,
    status: "success",
    email: "client1@example.com",
    name: "Client 1",
    description: "Project A Payment",
    date: "2023-06-15",
  },
  {
    id: "2",
    amount: 150,
    status: "success",
    email: "client2@example.com",
    name: "Client 2",
    description: "Project B Payment",
    date: "2023-06-14",
  },
  {
    id: "3",
    amount: 350,
    status: "pending",
    email: "client3@example.com",
    name: "Client 3",
    description: "Project C Payment",
    date: "2023-06-13",
  },
]

// If you need to modify this data dynamically, consider creating a mutable copy like this:
// export const getMutableTransactions = () => [...transactions];