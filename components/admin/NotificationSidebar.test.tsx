import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import NotificationSidebar from "./NotificationSidebar";
import type { App, Order } from "./types";

afterEach(() => {
  cleanup();
  localStorage.clear();
  window.dispatchEvent(new StorageEvent("storage", { key: null }));
});

describe("NotificationSidebar", () => {
  it("renders notifications without looping and updates after dismiss", () => {
    const franchise: App = {
      id: 17,
      full_name: "Application Test",
      email: "applicant@example.com",
      status: "pending",
      created_at: "2026-10-23T00:00:00Z",
    };
    const order: Order = {
      id: 31,
      customer_name: "Order Test",
      customer_email: "",
      customer_phone: "9999999999",
      customer_address: "Test address",
      items: "[]",
      total: 100,
      status: "pending",
      payment_method: "razorpay",
      payment_status: "paid",
      razorpay_order_id: "",
      razorpay_payment_id: "",
      notes: "",
      created_at: "2026-10-23T00:00:00Z",
      updated_at: "2026-10-23T00:00:00Z",
    };

    render(
      <NotificationSidebar
        franchises={[franchise]}
        orders={[order]}
        setTab={() => {}}
        onViewOrder={() => {}}
        role="super_admin"
      />,
    );

    expect(screen.getByText("Application Test")).toBeTruthy();
    expect(screen.getByText("Order Test")).toBeTruthy();

    fireEvent.click(screen.getAllByTitle("Dismiss")[1]);

    expect(screen.queryByText("Application Test")).toBeNull();
    expect(screen.getByText("Order Test")).toBeTruthy();
  });
});
