"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, ArrowUp } from "lucide-react";
import FundTypeIndicator from "@/components/common/FundTypeIndicator";
import { formatRupiah } from "@/lib/formatters";

interface FinancialImpact {
  amount: number;
  fundChanged: boolean;
  originalFund: string;
  newFund: string;
}

interface FundImpactPreviewProps {
  impact: FinancialImpact | null;
}

/**
 * Component to preview the impact of status changes on funds
 */
export default function FundImpactPreview({ impact }: FundImpactPreviewProps) {
  if (!impact) return null;
  
  return (
    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
      <div className="text-sm font-medium text-amber-800 mb-1">Payment Status Change Impact:</div>
      
      {impact.fundChanged ? (
        <>
          {/* If fund is changing, show impact on both funds */}
          {impact.amount !== 0 && (
            <>
              {/* If original fund needs adjustment */}
              <div className="flex items-center gap-2 text-sm">
                <FundTypeIndicator fundType={impact.originalFund} size="sm" />
                {impact.amount < 0 ? (
                  <span className="text-red-600 font-medium flex items-center">
                    <ArrowUp className="h-3 w-3 mr-1 text-red-600" />
                    -{formatRupiah(Math.abs(impact.amount))}
                  </span>
                ) : (
                  <span className="text-red-600 font-medium flex items-center">
                    Remove funds from previous fund
                  </span>
                )}
              </div>
              
              {/* Impact on new fund */}
              <div className="flex items-center gap-2 mt-1 text-sm">
                <FundTypeIndicator fundType={impact.newFund} size="sm" />
                <span className="text-green-600 font-medium flex items-center">
                  <ArrowUp className="h-3 w-3 mr-1 text-green-600" />
                  +{formatRupiah(Math.abs(impact.amount))}
                </span>
              </div>
            </>
          )}
          
          {impact.amount === 0 && (
            <Alert className="bg-blue-50 border-blue-200">
              <AlertCircle className="h-4 w-4 text-blue-500" />
              <AlertDescription className="text-blue-600">
                Only the fund destination will change. No amount change.
              </AlertDescription>
            </Alert>
          )}
        </>
      ) : (
        /* If amount is changing but fund remains the same */
        <div className="flex items-center gap-2 text-sm">
          <FundTypeIndicator fundType={impact.newFund} size="sm" />
          {impact.amount > 0 ? (
            <span className="text-green-600 font-medium flex items-center">
              <ArrowUp className="h-3 w-3 mr-1 text-green-600" />
              +{formatRupiah(impact.amount)}
            </span>
          ) : (
            <span className="text-red-600 font-medium flex items-center">
              <ArrowUp className="h-3 w-3 mr-1 text-red-600" />
              -{formatRupiah(Math.abs(impact.amount))}
            </span>
          )}
        </div>
      )}
    </div>
  );
}