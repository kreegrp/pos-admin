/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import useTables from "@/hooks/use-tables";
import useParties from "@/hooks/use-parties";
import useMenu from "@/hooks/use-menu";
import { SalesUpdateSchema } from "@/schema/FormSchema";
import { getUserIdFromLocalStorage } from "@/lib/utils";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Plus, Minus, X, ShoppingCart } from "lucide-react";

interface SalesItem {
  id?: number;
  itemName: string;
  quantity: number;
  rate: number;
  totalPrice: number;
  notes?: string;
  menuItemId?: number;
}

interface EditSalesProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedSale: any;
  onSaleUpdated?: () => void;
}

const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
if (!baseUrl) throw new Error("API base URL is not defined");

export default function EditSales({
  isOpen,
  onOpenChange,
  selectedSale,
  onSaleUpdated,
}: EditSalesProps) {
  const { data: tablesData } = useTables();
  const { data: partiesData } = useParties();
  const { data: menuData } = useMenu();

  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [salesItems, setSalesItems] = useState<SalesItem[]>([]);
  const [showAddItems, setShowAddItems] = useState(false);

  const [formData, setFormData] = useState({
    paymentStatus: "",
    orderStatus: "",
    paymentMethodId: "",
    orderType: "",
    tableId: "",
    partyId: "",
    subTotal: 0,
    discount: 0,
    tax: 0,
    deliveryCharges: 0,
    total: 0,
    notes: "",
  });

  useEffect(() => {
    const fetchPaymentMethods = async () => {
      try {
        const userId = getUserIdFromLocalStorage();
        const headers: Record<string, string> = userId ? { userId } : {};

        const response = await fetch(`${baseUrl}/payment-methods`, { headers });
        if (response.ok) {
          const data = await response.json();
          setPaymentMethods(data.data || []);
        }
      } catch (error) {
        console.error("Error fetching payment methods:", error);
        toast.error("Error loading payment methods");
      }
    };

    if (isOpen) {
      fetchPaymentMethods();
    }
  }, [baseUrl, isOpen]);

  useEffect(() => {
    if (selectedSale && isOpen) {
      setFormData({
        paymentStatus: selectedSale.paymentStatus || "",
        orderStatus: selectedSale.orderStatus || "",
        paymentMethodId: selectedSale.paymentMethodId?.toString() || "",
        orderType: selectedSale.orderType || "",
        tableId: selectedSale.tableId?.toString() || "",
        partyId: selectedSale.partyId?.toString() || "",
        subTotal: selectedSale.subTotal || 0,
        discount: selectedSale.discount || 0,
        tax: selectedSale.tax || 0,
        deliveryCharges: selectedSale.deliveryCharges || 0,
        total: selectedSale.total || 0,
        notes: selectedSale.notes || "",
      });

      const items =
        selectedSale.SalesItems?.map((item: any) => ({
          id: item.id,
          itemName: item.itemName,
          quantity: item.quantity,
          rate: item.rate || item.totalPrice / item.quantity,
          totalPrice: item.totalPrice,
          notes: item.notes || "",
          menuItemId: item.menuItemId,
        })) || [];

      setSalesItems(items);
      calculateTotals(items, selectedSale.discount || 0, selectedSale.tax || 0);
    }
  }, [selectedSale, isOpen]);

  const calculateTotals = (
    items: SalesItem[],
    discount: number = 0,
    tax: number = 0,
    deliveryCharges: number = 0
  ) => {
    const subTotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
    const total = subTotal - discount + tax + deliveryCharges;

    setFormData((prev) => ({
      ...prev,
      subTotal,
      total,
    }));
  };

  const updateItemQuantity = (index: number, newQuantity: number) => {
    if (newQuantity < 1) return;

    const updatedItems = [...salesItems];
    updatedItems[index].quantity = newQuantity;
    updatedItems[index].totalPrice = updatedItems[index].rate * newQuantity;

    setSalesItems(updatedItems);
    calculateTotals(updatedItems, formData.discount, formData.tax);
  };

  const removeItem = (index: number) => {
    const updatedItems = salesItems.filter((_, i) => i !== index);
    setSalesItems(updatedItems);
    calculateTotals(updatedItems, formData.discount, formData.tax);
  };

  const addMenuItem = (menuItem: any) => {
    const existingItemIndex = salesItems.findIndex(
      (item) => item.menuItemId === menuItem.id
    );

    if (existingItemIndex >= 0) {
      updateItemQuantity(
        existingItemIndex,
        salesItems[existingItemIndex].quantity + 1
      );
    } else {
      const newItem: SalesItem = {
        itemName: menuItem.itemName,
        quantity: 1,
        rate: menuItem.rate,
        totalPrice: menuItem.rate,
        notes: "",
        menuItemId: menuItem.id,
      };

      const updatedItems = [...salesItems, newItem];
      setSalesItems(updatedItems);
      calculateTotals(updatedItems, formData.discount, formData.tax);
    }
  };

  const handleFinancialChange = (
    field: "discount" | "tax" | "deliveryCharges",
    value: number
  ) => {
    const updatedFormData = { ...formData, [field]: value };
    setFormData(updatedFormData);
    calculateTotals(
      salesItems,
      updatedFormData.discount,
      updatedFormData.tax,
      updatedFormData.deliveryCharges
    );
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsFormLoading(true);

    try {
      const validatedData = SalesUpdateSchema.parse({
        ...formData,
        subTotal: Number(formData.subTotal),
        discount: Number(formData.discount),
        tax: Number(formData.tax),
        total: Number(formData.total),
      });

      const salesItemsData = salesItems.map((item) => ({
        id: item.id,
        itemName: item.itemName,
        quantity: item.quantity,
        rate: item.rate,
        totalPrice: item.totalPrice,
        notes: item.notes,
        menuItemId: item.menuItemId,
      }));

      const updateData = {
        ...validatedData,
        salesItems: salesItemsData,
      };

      console.log("Submitted form data:", updateData);

      const userId = getUserIdFromLocalStorage();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(userId ? { userId } : {}),
      };

      const response = await fetch(`${baseUrl}/sales/${selectedSale.id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        throw new Error("Failed to update sales record");
      }

      const result = await response.json();
      console.log("Update result:", result);

      toast.success("Sales record updated successfully!");
      onOpenChange(false);
      onSaleUpdated?.();
    } catch (error) {
      console.error("Error updating sales:", error);
      if (error instanceof Error) {
        toast.error(`Failed to update sales: ${error.message}`);
      } else {
        toast.error("Failed to update sales record");
      }
    } finally {
      setIsFormLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Edit Sales Record - {selectedSale?.invoiceNumber}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleFormSubmit} className="space-y-6 p-4">
          {/* Basic Information */}
          <div className="grid grid-cols-2 gap-4">
            {/* Payment Status */}
            <div>
              <Label>Payment Status *</Label>
              <Select value={formData.paymentStatus} disabled>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Order Status */}
            <div>
              <Label>Order Status *</Label>
              <Select value={formData.orderStatus} disabled>
                <SelectTrigger>
                  <SelectValue placeholder="Select order status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="preparing">Preparing</SelectItem>
                  <SelectItem value="ready">Ready</SelectItem>
                  <SelectItem value="served">Served</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Payment Method */}
            <div>
              <Label>Payment Method *</Label>
              <Select value={formData.paymentMethodId} disabled>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method.id} value={method.id.toString()}>
                      {method.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Order Type */}
            <div>
              <Label>Order Type *</Label>
              <Select value={formData.orderType} disabled>
                <SelectTrigger>
                  <SelectValue placeholder="Select order type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dine-in">Dine In</SelectItem>
                  <SelectItem value="takeaway">Takeaway</SelectItem>
                  <SelectItem value="delivery">Delivery</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Table */}
            <div>
              <Label>Table *</Label>
              <Select value={formData.tableId} disabled>
                <SelectTrigger>
                  <SelectValue placeholder="Select table" />
                </SelectTrigger>
                <SelectContent>
                  {tablesData?.map((table: any) => (
                    <SelectItem key={table.id} value={table.id.toString()}>
                      {table.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Customer */}
            <div>
              <Label>Customer *</Label>
              <Select value={formData.partyId} disabled>
                <SelectTrigger>
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {partiesData?.map((party: any) => (
                    <SelectItem key={party.id} value={party.id.toString()}>
                      {party.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Items Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-lg font-medium">Order Items</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAddItems(!showAddItems)}
              >
                <Plus className="w-4 h-4 mr-1" />
                {showAddItems ? "Hide Menu" : "Add Items"}
              </Button>
            </div>

            {/* Current Items */}
            <div className="space-y-2">
              {salesItems.map((item, index) => (
                <Card key={index} className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium">{item.itemName}</div>
                      <div className="text-sm text-muted-foreground">
                        रु.{item.rate.toFixed(2)} each
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          updateItemQuantity(index, item.quantity - 1)
                        }
                        disabled={item.quantity <= 1}
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="w-12 text-center font-medium">
                        {item.quantity}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          updateItemQuantity(index, item.quantity + 1)
                        }
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                      <div className="w-20 text-right font-medium">
                        रु.{item.totalPrice.toFixed(2)}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeItem(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Add Items Menu */}
            {showAddItems && (
              <Card className="p-4">
                <CardHeader className="px-0 pt-0">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5" />
                    Add Items from Menu
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-0 pb-0">
                  <div className="space-y-4 max-h-64 overflow-y-auto">
                    {menuData?.map((categoryData: any) => (
                      <div key={categoryData.category.id}>
                        <h4 className="font-medium mb-2 text-primary">
                          {categoryData.category.name}
                        </h4>
                        <div className="grid grid-cols-2 gap-2 mb-4">
                          {categoryData.category.items?.map((item: any) => (
                            <Card
                              key={item.id}
                              className="p-3 cursor-pointer hover:bg-gray-50 border-dashed"
                              onClick={() => addMenuItem(item)}
                            >
                              <div className="flex justify-between items-center">
                                <div>
                                  <div className="font-medium text-sm">
                                    {item.itemName}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    रु.{item.rate.toFixed(2)}
                                  </div>
                                </div>
                                <Badge variant="secondary" className="text-xs">
                                  <Plus className="w-3 h-3" />
                                </Badge>
                              </div>
                            </Card>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Financial Details */}
          <div className="grid grid-cols-2 gap-4">
            {/* Discount */}
            <div>
              <Label>Discount</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.discount}
                onChange={(e) =>
                  handleFinancialChange(
                    "discount",
                    parseFloat(e.target.value) || 0
                  )
                }
                placeholder="Enter discount"
              />
            </div>

            {/* Tax */}
            <div>
              <Label>Tax</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.tax}
                onChange={(e) =>
                  handleFinancialChange("tax", parseFloat(e.target.value) || 0)
                }
                placeholder="Enter tax"
              />
            </div>

            {/* Delivery Charges */}
            <div>
              <Label>Delivery Charges</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.deliveryCharges || 0}
                onChange={(e) =>
                  handleFinancialChange(
                    "deliveryCharges",
                    parseFloat(e.target.value) || 0
                  )
                }
                placeholder="Enter delivery charges"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label>Notes</Label>
            <Input
              type="text"
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              placeholder="Enter any additional notes"
            />
          </div>

          {/* Order Summary */}
          <Card className="bg-gray-50">
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>रु.{formData.subTotal.toFixed(2)}</span>
                </div>
                {formData.discount > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Discount:</span>
                    <span>-रु.{formData.discount.toFixed(2)}</span>
                  </div>
                )}
                {formData.tax > 0 && (
                  <div className="flex justify-between">
                    <span>Tax:</span>
                    <span>रु.{formData.tax.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Total:</span>
                  <span>रु.{formData.total.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isFormLoading}>
              {isFormLoading ? "Updating..." : "Update Sales"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
