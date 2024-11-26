import { ChatInputCommandInteraction, Guild, SlashCommandBuilder } from 'discord.js';
import { insertDiscordUsers } from './database'; // Adjust this import based on your project structure
import log from "../logger.js";
import { discordConfig } from "@config";

const command = {
    data: new SlashCommandBuilder()
        .setName('get-members-and-insert-to-db')
        .setDescription('Get and insert all members of the guild to the db in new collection')
        .setGuild(config.GUILD_ID), // Replace with your preferred way of defining guilds
    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply();

        try {
            const guild: Guild | null = interaction.guild;

            if (!guild) {
                await interaction.followUp({ content: 'Guild not found.', ephemeral: true });
                return;
            }

            const members = await guild.members.fetch(); // Fetch all members
            const memberList = members.map(member => ({ [member.user.username]: member.user.id }));

            logger.info(memberList);

            const result = await insertDiscordUsers(memberList);
            if (result) {
                await interaction.followUp('Users successfully inserted');
            }
        } catch (e) {
            logger.error(`An error occurred: ${e}`);
            await interaction.followUp({ content: `An error occurred: ${e}`, ephemeral: true });
        }
    },
};

export default command;
