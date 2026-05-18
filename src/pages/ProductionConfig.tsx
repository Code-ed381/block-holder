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
} from "../types";
import {
  getProductionConfigs,
  updateProductionConfig,
  resetProductionConfigs,
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

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      const results =
        (await getProductionConfigs()) as ProductionConfigType[];
      setConfigs(results);

      // Initialize edit states with current values
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
      </div>
    </div>
  );
};
