import log from "../logger.js";

export const getGuildMembers = async (interaction) => {
    try {
        const guild = interaction.guild;

        if (!guild) {
            await interaction.followUp({ content: 'Guild not found.', ephemeral: true });
            return [];
        }

        const members = await guild.members.fetch();
        const memberList = members.map(member => ({ username: member.user.username, id: member.user.id }));

        return memberList;
    } catch (e) {
        log.error(`An error occurred while fetching members: ${e}`);
        await interaction.followUp({ content: `An error occurred: ${e.message}`, ephemeral: true });
    }
};