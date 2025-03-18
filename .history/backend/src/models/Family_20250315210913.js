// Improved Family.js model with proper associations
const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

// Define the Family model
const Family = sequelize.define(
  "Family",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "Users",
        key: "id",
      },
    },
    settings: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {
        privacyLevel: "private",
        notificationPreferences: {
          events: true,
          tasks: true,
          documents: true,
        },
      },
    },
  },
  {
    tableName: "Families", // Explicitly set table name
    timestamps: true,
    createdAt: "createdAt",
    updatedAt: "updatedAt",
  }
);

module.exports = Family;
