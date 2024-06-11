import { interactionCreateHandler } from "../src/handlers/bot.js";

describe("interactionCreateHandler", () => {
  const interaction = {
    user: { username: "mior8667" },
    isChatInputCommand: jest.fn(),
    isButton: jest.fn(),
    isModalSubmit: jest.fn(),
    isAutocomplete: jest.fn(),
  };
  it("should call interaction create handler", async () => {
    interactionCreateHandler(interaction);
    expect(interaction.isChatInputCommand).toHaveBeenCalledWith();
    expect(interaction.isButton).toHaveBeenCalledWith();
    expect(interaction.isModalSubmit).toHaveBeenCalledWith();
    expect(interaction.isAutocomplete).toHaveBeenCalledWith();
  });
});
