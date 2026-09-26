import { fireEvent, render, screen } from "@testing-library/react";

import { Button } from "./Button";

describe("Button", () => {
  it("forwards clicks when enabled", () => {
    const onClick = jest.fn();
    render(<Button onClick={onClick}>Сохранить</Button>);

    fireEvent.click(screen.getByRole("button", { name: "Сохранить" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("is disabled while loading", () => {
    render(<Button loading>Сохраняем</Button>);

    expect(screen.getByRole("button", { name: "Сохраняем" })).toBeDisabled();
  });
});
