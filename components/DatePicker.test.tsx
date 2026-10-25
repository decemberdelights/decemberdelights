import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import DatePicker from "./DatePicker";

describe("DatePicker", () => {
  it("opens and selects a date using only the keyboard", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DatePicker value="" onChange={onChange} />);

    await user.tab();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("dialog", { name: "Choose a date" })).toBeTruthy();

    for (let i = 0; i < 17; i += 1) await user.tab();
    await user.keyboard("{Enter}");

    const currentYear = new Date().getFullYear() - 25;
    expect(onChange).toHaveBeenCalledWith(`${currentYear}-01-15`);
    expect(screen.queryByRole("dialog", { name: "Choose a date" })).toBeNull();
  });

  it("reflects the selected date in the accessible trigger name", () => {
    render(<DatePicker value="2001-01-15" onChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Selected date: 15 January 2001" })).toBeTruthy();
  });
});
