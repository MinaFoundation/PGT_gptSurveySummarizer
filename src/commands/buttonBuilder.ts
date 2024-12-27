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

export const secondAdminActionRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
    .setCustomId('edit_survey')
    .setLabel('Edit Survey')
    .setStyle(ButtonStyle.Success),
  new ButtonBuilder()
    .setCustomId('delete_survey')
    .setLabel('Delete Survey')
    .setStyle(ButtonStyle.Danger),
  new ButtonBuilder()
    .setCustomId('info')
    .setLabel('Info')
    .setStyle(ButtonStyle.Primary),
  new ButtonBuilder()
    .setCustomId('create_multi_survey')
    .setLabel('Create Multi Choice Survey')
    .setStyle(ButtonStyle.Secondary)
)