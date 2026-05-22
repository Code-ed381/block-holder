/**
 * Production Config Settings Page (Manager Only)
 * Allows managers to configure batch settings per block type
 */

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navigation } from "../components/Navigation";
import type {
  ProductionConfig as ProductionConfigType,
  BlockType,
  SpecializationConfig,
  ProductionSettings,
} from "../types";
import {
  getProductionConfigs,
  updateProductionConfig,
  resetProductionConfigs,
  getSpecializationConfigs,
  updateSpecializationConfig,
  getProductionSettings,
  updateProductionSettings,
} from "../utils/db";

const formatBlockType = (type: BlockType): string => {
  return type
    .replace("-", " ")
    .replace("inch", "in")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export const ProductionConfig: React.FC = () => {
  const navigate = useNavigate();
  const [configs, setConfigs] = useState<ProductionConfigType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Set<string>>(new Set());
  const [editStates, setEditStates] = useState<
    Record<string, ProductionConfigType>
  >({});

  // Specialization config state
  const [specConfigs, setSpecConfigs] = useState<SpecializationConfig[]>([]);
  const [specEditStates, setSpecEditStates] = useState<
    Record<string, SpecializationConfig>
  >({});
  const [savingSpec, setSavingSpec] = useState<Set<string>>(new Set());

  // Production settings state
  const [editSettings, setEditSettings] = useState<ProductionSettings | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    loadConfigs();
    loadSpecConfigs();
    loadProdSettings();
  }, []);

  const loadConfigs = async () => {
    try {
      const results =
        (await getProductionConfigs()) as ProductionConfigType[];
      setConfigs(results);
      const initialEditStates: Record<string, ProductionConfigType> = {};
      results.forEach((config) => {
        initialEditStates[config.id] = { ...config };
      });
      setEditStates(initialEditStates);
    } catch (error) {
      console.error("Failed to load configs:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadSpecConfigs = async () => {
    try {
      const results = (await getSpecializationConfigs()) as SpecializationConfig[];
      setSpecConfigs(results);
      const initial: Record<string, SpecializationConfig> = {};
      results.forEach((c) => {
        initial[c.id] = { ...c };
      });
      setSpecEditStates(initial);
    } catch (error) {
      console.error("Failed to load specialization configs:", error);
    }
  };

  const loadProdSettings = async () => {
    try {
      const result = (await getProductionSettings()) as ProductionSettings;
      setEditSettings({ ...result });
    } catch (error) {
      console.error("Failed to load production settings:", error);
    }
  };

  const handleFieldChange = (
    configId: string,
    field: keyof ProductionConfigType,
    value: string | number,
  ) => {
    setEditStates((prev) => ({
      ...prev,
      [configId]: {
        ...prev[configId],
        [field]: value,
      },
    }));
  };

  const handleSave = async (configId: string) => {
    const editState = editStates[configId];
    if (!editState) return;

    setSaving((prev) => new Set(prev).add(configId));

    try {
      await updateProductionConfig(configId, {
        bags_per_batch: editState.bags_per_batch,
        quarry_dust_m3_per_batch: editState.quarry_dust_m3_per_batch,
        blocks_per_batch: editState.blocks_per_batch,
      });

      // Update local state
      setConfigs((prev) =>
        prev.map((config) =>
          config.id === configId ? { ...editState } : config,
        ),
      );
    } catch (error) {
      console.error("Failed to save config:", error);
      alert("Failed to save configuration. Please try again.");
    } finally {
      setSaving((prev) => {
        const newSet = new Set(prev);
        newSet.delete(configId);
        return newSet;
      });
    }
  };

  const handleSpecFieldChange = (
    configId: string,
    field: "daily_rate" | "per_block_rate",
    value: number,
  ) => {
    setSpecEditStates((prev) => ({
      ...prev,
      [configId]: {
        ...prev[configId],
        [field]: value,
      },
    }));
  };

  const handleSaveSpecConfig = async (configId: string) => {
    const editState = specEditStates[configId];
    if (!editState) return;

    setSavingSpec((prev) => new Set(prev).add(configId));
    try {
      await updateSpecializationConfig(configId, {
        daily_rate: editState.daily_rate,
        per_block_rate: editState.per_block_rate,
      });
      setSpecConfigs((prev) =>
        prev.map((c) => (c.id === configId ? { ...editState } : c)),
      );
    } catch (error) {
      console.error("Failed to save specialization config:", error);
      alert("Failed to save. Please try again.");
    } finally {
      setSavingSpec((prev) => {
        const newSet = new Set(prev);
        newSet.delete(configId);
        return newSet;
      });
    }
  };

  const handleSaveSettings = async () => {
    if (!editSettings) return;
    setSavingSettings(true);
    try {
      const result = await updateProductionSettings({
        blocks_per_bonus: editSettings.blocks_per_bonus,
        bonus_amount: editSettings.bonus_amount,
      });
      setEditSettings({ ...result });
      alert("Production settings saved successfully!");
    } catch (error) {
      console.error("Failed to save production settings:", error);
      alert("Failed to save. Please try again.");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleResetToDefaults = async () => {
    if (
      !confirm(
        "Are you sure you want to reset all configurations to default values? This will affect all future production logs.",
      )
    ) {
      return;
    }

    try {
      const updatedConfigs =
        (await resetProductionConfigs()) as ProductionConfigType[];
      setConfigs(updatedConfigs);

      // Reset edit states
      const newEditStates: Record<string, ProductionConfigType> = {};
      updatedConfigs.forEach((config) => {
        newEditStates[config.id] = { ...config };
      });
      setEditStates(newEditStates);

      alert("All configurations have been reset to default values.");
    } catch (error) {
      console.error("Failed to reset configs:", error);
      alert("Failed to reset configurations. Please try again.");
    }
  };

  const calculateRatio = (config: ProductionConfigType): string => {
    const dustPerBag = config.quarry_dust_m3_per_batch / config.bags_per_batch;
    return `1 bag + ${dustPerBag.toFixed(2)} m³ → ${config.blocks_per_batch} blocks`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <p className="text-gray-600">Loading configuration...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <button
            onClick={() => navigate("/manager")}
            className="text-blue-600 hover:text-blue-800 mb-4 inline-block"
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Production Configuration
          </h1>
          <p className="text-gray-600">
            Configure batch settings for each block type. Changes apply to all
            future production logs.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-800">
              Batch Settings
            </h2>
            <button
              onClick={handleResetToDefaults}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm font-medium"
            >
              Reset to Defaults
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Block Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cement Bags per Batch
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quarry Dust (m³) per Batch
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Blocks per Batch
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ratio
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {configs.map((config) => {
                  const editState = editStates[config.id] || config;
                  const isSaving = saving.has(config.id);
                  const hasChanges =
                    editState.bags_per_batch !== config.bags_per_batch ||
                    editState.quarry_dust_m3_per_batch !==
                      config.quarry_dust_m3_per_batch ||
                    editState.blocks_per_batch !== config.blocks_per_batch;

                  return (
                    <tr key={config.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">
                          {formatBlockType(config.block_type)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={editState.bags_per_batch}
                          onChange={(e) =>
                            handleFieldChange(
                              config.id,
                              "bags_per_batch",
                              parseInt(e.target.value) || 0,
                            )
                          }
                          className="w-24 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="number"
                          min="0.1"
                          step="0.1"
                          value={editState.quarry_dust_m3_per_batch}
                          onChange={(e) =>
                            handleFieldChange(
                              config.id,
                              "quarry_dust_m3_per_batch",
                              parseFloat(e.target.value) || 0,
                            )
                          }
                          className="w-24 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={editState.blocks_per_batch}
                          onChange={(e) =>
                            handleFieldChange(
                              config.id,
                              "blocks_per_batch",
                              parseInt(e.target.value) || 0,
                            )
                          }
                          className="w-24 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600">
                          {calculateRatio(editState)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {hasChanges ? (
                          <button
                            onClick={() => handleSave(config.id)}
                            disabled={isSaving}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isSaving ? "Saving..." : "Save"}
                          </button>
                        ) : (
                          <span className="text-sm text-green-600 font-medium">
                            ✓ Saved
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-800 mb-2">
            ℹ️ Information
          </h3>
          <p className="text-sm text-blue-700">
            Changes to production configuration will only affect future
            production logs. Existing logs will retain their original values.
          </p>
        </div>

        {/* Specialization Rates */}
        <div className="bg-white rounded-lg shadow overflow-hidden mt-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">
              Specialization Rates
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Set daily rates for builders (operator, mixer, palletizer) and per-block rates for drivers &amp; loaders.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Specialization</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Daily Rate (₵)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Per Block Rate (₵)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {specConfigs.map((config) => {
                  const editState = specEditStates[config.id] || config;
                  const isSaving = savingSpec.has(config.id);
                  const hasChanges =
                    editState.daily_rate !== config.daily_rate ||
                    editState.per_block_rate !== config.per_block_rate;

                  return (
                    <tr key={config.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900 capitalize">{config.specialization}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={editState.daily_rate}
                          onChange={(e) =>
                            handleSpecFieldChange(config.id, "daily_rate", parseFloat(e.target.value) || 0)
                          }
                          className="w-24 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={editState.per_block_rate}
                          onChange={(e) =>
                            handleSpecFieldChange(config.id, "per_block_rate", parseFloat(e.target.value) || 0)
                          }
                          className="w-24 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {hasChanges ? (
                          <button
                            onClick={() => handleSaveSpecConfig(config.id)}
                            disabled={isSaving}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isSaving ? "Saving..." : "Save"}
                          </button>
                        ) : (
                          <span className="text-sm text-green-600 font-medium">✓ Saved</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Production Settings */}
        <div className="bg-white rounded-lg shadow overflow-hidden mt-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">
              Builder Bonus Settings
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Builders (operator, mixer, palletizer) split this bonus equally per day based on total blocks produced.
            </p>
          </div>
          <div className="p-6">
            {editSettings && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Blocks per Bonus Batch
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={editSettings.blocks_per_bonus}
                    onChange={(e) =>
                      setEditSettings({ ...editSettings, blocks_per_bonus: parseInt(e.target.value) || 1 })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    e.g. 40 blocks = 1 bonus batch
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bonus Amount per Batch (₵)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editSettings.bonus_amount}
                    onChange={(e) =>
                      setEditSettings({ ...editSettings, bonus_amount: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    e.g. ₵30 per 40 blocks
                  </p>
                </div>
              </div>
            )}
            <div className="mt-4">
              <button
                onClick={handleSaveSettings}
                disabled={savingSettings || !editSettings}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingSettings ? "Saving..." : "Save Settings"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
