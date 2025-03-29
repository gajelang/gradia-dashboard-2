"use client";

import { DollarSign, ExternalLink } from "lucide-react";
import { formatRupiah } from "@/lib/formatters";
import FundTypeIndicator from "@/components/common/FundTypeIndicator";
import StatusBadge from "@/components/common/StatusBadge";

interface FinancialInfoProps {
  transaction: any;
}

/**
 * Financial information section for transaction details
 */
export default function FinancialInfo({ transaction }: FinancialInfoProps) {
  // Calculate net profit (totalProfit - capitalCost)
  const calculateNetProfit = () => {
    const totalProfit = transaction.totalProfit || transaction.projectValue || 0;
    const capitalCost = transaction.capitalCost || 0;
    return totalProfit - capitalCost;
  };
  
  return (
    <div className="space-y-2">
      <h3 className="text-lg font-bold flex items-center">
        <DollarSign className="h-5 w-5 mr-2 text-primary" />
        Financial Information
      </h3>
      <div className="grid grid-cols-3 gap-1">
        <div className="text-sm font-medium">Fund Type:</div>
        <div className="text-sm col-span-2">
          <FundTypeIndicator fundType={transaction.fundType || "petty_cash"} />
        </div>

        <div className="text-sm font-medium">Project Value:</div>
        <div className="text-sm col-span-2">
          Rp{formatRupiah(transaction.projectValue || 0)}
        </div>

        <div className="text-sm font-medium">Capital Cost:</div>
        <div className="text-sm col-span-2">
          Rp{formatRupiah(transaction.capitalCost || 0)}
        </div>

        <div className="text-sm font-medium">Net Profit:</div>
        <div className="text-sm col-span-2">
          Rp{formatRupiah(calculateNetProfit())}
        </div>

        <div className="text-sm font-medium">Payment Status:</div>
        <div className="text-sm col-span-2">
          <StatusBadge status={transaction.paymentStatus} />
        </div>

        {transaction.paymentStatus === "DP" && (
          <>
            <div className="text-sm font-medium">Down Payment:</div>
            <div className="text-sm col-span-2">
              Rp{formatRupiah(transaction.downPaymentAmount || 0)}
            </div>

            <div className="text-sm font-medium">Remaining Amount:</div>
            <div className="text-sm col-span-2">
              Rp{formatRupiah(transaction.remainingAmount || 0)}
            </div>
          </>
        )}

        <div className="text-sm font-medium">Amount Paid:</div>
        <div className="text-sm col-span-2 text-green-600 font-semibold">
          Rp{formatRupiah(
            transaction.paymentStatus === "Lunas"
              ? transaction.projectValue || 0
              : transaction.paymentStatus === "DP"
              ? transaction.downPaymentAmount || 0
              : 0
          )}
        </div>
      </div>
      
      {/* Payment Proof Link */}
      {transaction.paymentProofLink && (
        <div className="mt-3">
          <h4 className="text-sm font-medium mb-1">Payment Proof:</h4>
          <a
            href={transaction.paymentProofLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline flex items-center text-sm"
          >
            <ExternalLink className="h-4 w-4 mr-1" />
            View Payment Proof
          </a>
        </div>
      )}
    </div>
  );
}