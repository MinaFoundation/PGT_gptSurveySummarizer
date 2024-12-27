import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js'

export const adminActionRow = new ActionRowBuilder().addComponents(
  new ButtonBuilder()
    .setCustomId('start_auto_post')
    .setLabel('Start Auto Post')
    .setStyle(ButtonStyle.Success),
  new ButtonBuilder()
    .setCustomId('stop_auto_post')
    .setLabel('Stop Auto Post')
    .setStyle(ButtonStyle.Danger),
  new ButtonBuilder()
    .setCustomId('view_leaderboard')
    .setLabel('View Leaderboard')
    .setStyle(ButtonStyle.Primary),
  new ButtonBuilder()
    .setCustomId('create_survey')
    .setLabel('Create Survey')
    .setStyle(ButtonStyle.Secondary)
);
