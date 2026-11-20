import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import DatePicker from "./DatePicker";

afterEach(cleanup);

describe("DatePicker", () => {
  it("shows compact scrollable month and year lists and allows direct selection", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DatePicker value="" onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "Select date" }));
    expect(screen.getByRole("dialog", { name: "Choose a date" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Month" }));
    await user.click(screen.getByRole("option", { name: "Jan" }));

    await user.click(screen.getByRole("button", { name: "Year" }));
    const yearList = screen.getByRole("listbox", { name: "Choose year" });
    expect(yearList.style.overflowY).toBe("auto");
    expect(yearList.style.maxHeight).toBe("240px");
    expect(yearList.style.touchAction).toBe("pan-y");
    await user.click(screen.getByRole("option", { name: "2001" }));

    await user.click(screen.getByRole("button", { name: "15" }));

    expect(onChange).toHaveBeenCalledWith("2001-01-15");
    expect(screen.queryByRole("dialog", { name: "Choose a date" })).toBeNull();
  });

  it("reflects the selected date in the accessible trigger name", () => {
    render(<DatePicker value="2001-01-15" onChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Selected date: 15 January 2001" })).toBeTruthy();
  });

  it("keeps the year list open when a mobile swipe ends over an option", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DatePicker value="" onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "Select date" }));
    await user.click(screen.getByRole("button", { name: "Year" }));

    const yearList = screen.getByRole("listbox", { name: "Choose year" });
    expect(yearList.hasAttribute("data-lenis-prevent")).toBe(true);
    fireEvent.touchStart(yearList, { touches: [{ clientY: 180 }] });
    fireEvent.touchMove(yearList, { touches: [{ clientY: 80 }] });
    fireEvent.touchEnd(yearList);
    fireEvent.click(screen.getByRole("option", { name: "2001" }));

    expect(screen.getByRole("listbox", { name: "Choose year" })).toBeTruthy();
    expect(onChange).not.toHaveBeenCalled();
  });
});
