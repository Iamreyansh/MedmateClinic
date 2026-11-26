import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { store } from "@/store";
import { auth } from "@/services/api/client";
import { mock } from "@/services/api/mock/router";
import "@/services/api/mock/routes";
import { PatientListScreen } from "@/features/patients";
import { DeskScreen } from "@/features/desk";
import { KioskScreen } from "@/features/kiosk";
import { SubscriptionScreen } from "@/features/subscription";
import { BookScreen } from "@/features/patient-web";

/**
 * The screens, rendered.
 *
 * These are the screens the design names, drawn against the mock: what a
 * person sees when the data has arrived, and what they see when it has not.
 */

/** The screen, in the app around it. */
function draw(element: React.ReactElement, route = "/") {
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[route]}>{element}</MemoryRouter>
    </Provider>,
  );
}

beforeEach(() => {
  // the mock answers the endpoints behind the session only to a signed-in
  // person, so each test signs in first
  auth.set("mock.session.value");
});

describe("the patient list", () => {
  it("shows the search, the filters and the patients", async () => {
    draw(<PatientListScreen />);

    expect(await screen.findByPlaceholderText(/Search name, mobile, ABHA/i)).toBeInTheDocument();
    expect(await screen.findByText("Everyone")).toBeInTheDocument();
    expect(await screen.findByText("Here today")).toBeInTheDocument();
    expect(await screen.findByText("Follow-up due")).toBeInTheDocument();
    // the list arrives with the patients in it
    expect(await screen.findByText("Kavya Nair")).toBeInTheDocument();
  });

  it("opens the record of a patient in the list", async () => {
    draw(<PatientListScreen />);
    const row = await screen.findByText("Kavya Nair");
    expect(row.closest("a")).toHaveAttribute("href", "/patients/pt_kavya");
  });
});

describe("the reception desk", () => {
  it("shows the four tiles and the till's door", async () => {
    draw(<DeskScreen />);

    expect(await screen.findByText("Waiting at the desk")).toBeInTheDocument();
    expect(await screen.findByText("To collect")).toBeInTheDocument();
    expect(await screen.findByText("Follow-ups to book")).toBeInTheDocument();
    // "Done today" is both a tile and a filter, so it is counted, not matched
    await waitFor(() => expect(screen.getAllByText("Done today").length).toBeGreaterThan(0));
    // the nav has a "Billing & POS" too, so the desk's own button is found by
    // where it points
    await waitFor(() =>
      expect(
        screen.getAllByRole("link", { name: /Billing/ }).some((link) => link.getAttribute("href") === "/billing"),
      ).toBe(true),
    );
  });
});

describe("the kiosk", () => {
  it("stands on its own and waits for a patient to tap", async () => {
    // the kiosk is closed until the front desk opens it
    await mock.handle("POST", "/kiosk/open", undefined);

    draw(<KioskScreen />, "/kiosk");

    // the tablet, not the staff shell
    expect(await screen.findByText("Welcome")).toBeInTheDocument();
    expect(screen.queryByText("Doctor console")).not.toBeInTheDocument();
    // and it offers the code to scan with a phone
    expect(await screen.findByText(/Or use your phone/i)).toBeInTheDocument();
  });
});

describe("the subscription", () => {
  it("counts doctors, locations and staff", async () => {
    draw(<SubscriptionScreen />);

    // the nav has a Doctors and a Locations too, so they are counted
    await waitFor(() => expect(screen.getAllByText("Doctors").length).toBeGreaterThan(0));
    await waitFor(() => expect(screen.getAllByText("Locations").length).toBeGreaterThan(0));
    await waitFor(() => expect(screen.getAllByText("Staff").length).toBeGreaterThan(0));
    // and it says the payments are test payments
    expect(await screen.findByText(/Test payments/i)).toBeInTheDocument();
  });
});

describe("the booking page", () => {
  it("shows the clinic and its doctors", async () => {
    draw(<BookScreen />, "/book?clinic=medmate-clinic");

    expect(await screen.findByText(/Book a doctor/i)).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText(/MedMate Clinic Indiranagar/i)).toBeInTheDocument(),
    );
  });
});
