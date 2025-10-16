/**
 * VIB34D Variation Management System
 * Manages 100 total variations: 38 default + 62 custom
 */

import { GeometryLibrary } from '../geometry/GeometryLibrary.js';
import {
    DEFAULT_VARIATIONS,
    DEFAULT_VARIATION_COUNT,
    GEOMETRY_SECTIONS,
    getDefaultVariationDefinition
} from './variationPresets.js';

export class VariationManager {
    constructor(engine) {
        this.engine = engine;
        
        this.defaultVariations = DEFAULT_VARIATIONS;
        this.defaultVariationCount = DEFAULT_VARIATION_COUNT;

        // Default variation names (38 total)
        this.variationNames = this.defaultVariations.map(variation => variation.name);

        // Custom variations storage (fills remaining slots up to 100)
        this.customVariations = new Array(100 - this.defaultVariationCount).fill(null);

        // Total variation count
        this.totalVariations = this.defaultVariationCount + this.customVariations.length;
    }
    
    /**
     * Get variation name for display
     */
    getVariationName(index) {
        const defaultCount = this.defaultVariationCount;
        if (index < defaultCount) {
            return this.variationNames[index];
        } else {
            const customIndex = index - defaultCount;
            const customVar = this.customVariations[customIndex];
            return customVar ? customVar.name : `CUSTOM ${customIndex + 1}`;
        }
    }
    
    /**
     * Generate default variation parameters
     */
    generateDefaultVariation(index) {
        const defaultCount = this.defaultVariationCount;
        if (index >= defaultCount) return null;

        const definition = getDefaultVariationDefinition(index);
        if (!definition) return null;

        const params = GeometryLibrary.getVariationParameters(definition.geometry, definition.level);

        return {
            variation: index,
            geometry: definition.geometry,
            ...params
        };
    }
    
    /**
     * Apply specific variation to the engine
     */
    applyVariation(index) {
        if (index < 0 || index >= this.totalVariations) return false;
        
        let params;
        
        const defaultCount = this.defaultVariationCount;
        if (index < defaultCount) {
            // Default variation
            params = this.generateDefaultVariation(index);
        } else {
            // Custom variation
            const customIndex = index - defaultCount;
            const customVar = this.customVariations[customIndex];
            
            if (customVar) {
                params = { ...customVar.parameters, variation: index };
            } else {
                // Empty slot - use current parameters
                params = { ...this.engine.parameterManager.getAllParameters(), variation: index };
            }
        }
        
        if (params) {
            this.engine.parameterManager.setParameters(params);
            this.engine.currentVariation = index;
            return true;
        }
        
        return false;
    }
    
    /**
     * Save current state as custom variation
     */
    saveCurrentAsCustom() {
        // Find first empty custom slot
        const emptyIndex = this.customVariations.findIndex(slot => slot === null);
        
        if (emptyIndex === -1) {
            return -1; // No empty slots
        }
        
        const currentParams = this.engine.parameterManager.getAllParameters();
        const currentGeometry = GeometryLibrary.getGeometryName(currentParams.geometry);
        
        const customVariation = {
            name: `${currentGeometry} CUSTOM ${emptyIndex + 1}`,
            timestamp: new Date().toISOString(),
            parameters: { ...currentParams },
            metadata: {
                basedOnVariation: this.engine.currentVariation,
                createdFrom: 'current-state'
            }
        };
        
        this.customVariations[emptyIndex] = customVariation;
        this.saveCustomVariations();
        
        return this.defaultVariationCount + emptyIndex; // Return absolute variation index
    }
    
    /**
     * Delete custom variation
     */
    deleteCustomVariation(customIndex) {
        if (customIndex >= 0 && customIndex < this.customVariations.length) {
            this.customVariations[customIndex] = null;
            this.saveCustomVariations();
            return true;
        }
        return false;
    }
    
    /**
     * Populate the variation grid UI
     */
    populateGrid() {
        const gridContainer = document.getElementById('variationGrid');
        if (!gridContainer) return;
        
        gridContainer.innerHTML = '';
        
        // Add default variations grouped by geometry
        GEOMETRY_SECTIONS.forEach(section => {
            const sectionDiv = document.createElement('div');
            sectionDiv.className = 'variation-section';
            sectionDiv.innerHTML = `<h3>${section.name} Lattice</h3>`;

            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'variation-buttons';

            this.defaultVariations
                .map((definition, index) => ({ definition, index }))
                .filter(item => item.definition.geometry === section.geometry)
                .forEach(item => {
                    const button = this.createVariationButton(
                        item.index,
                        true,
                        section.className,
                        item.definition.level + 1,
                        item.definition.geometry
                    );
                    buttonContainer.appendChild(button);
                });

            sectionDiv.appendChild(buttonContainer);
            gridContainer.appendChild(sectionDiv);
        });

        // Add custom variations section
        const customSection = document.createElement('div');
        customSection.className = 'variation-section custom-section';
        customSection.innerHTML = '<h3>Custom Variations</h3>';
        
        const customContainer = document.createElement('div');
        customContainer.className = 'variation-buttons custom-grid';
        
        for (let i = 0; i < this.customVariations.length; i++) {
            const button = this.createVariationButton(this.defaultVariationCount + i, false, 'custom');
            customContainer.appendChild(button);
        }
        
        customSection.appendChild(customContainer);
        gridContainer.appendChild(customSection);
    }
    
    /**
     * Create individual variation button
     */
    createVariationButton(variationIndex, isDefault, geomClass, level = null, geometryType = null) {
        const button = document.createElement('button');
        const name = this.getVariationName(variationIndex);

        button.className = `preset-btn ${geomClass} ${isDefault ? 'default-variation' : 'custom-variation'}`;
        button.dataset.variation = variationIndex;
        button.title = `${variationIndex + 1}. ${name}`;

        if (geometryType !== null && geometryType !== undefined) {
            button.dataset.geometry = geometryType;
            if (level !== null) {
                button.dataset.level = level - 1;
            }
        }

        // Button content
        if (isDefault) {
            button.innerHTML = `
                <div class="variation-number">${(variationIndex + 1).toString().padStart(2, '0')}</div>
                <div class="variation-level">Level ${level || 1}</div>
            `;
        } else {
            const customIndex = variationIndex - this.defaultVariationCount;
            const hasCustom = this.customVariations[customIndex] !== null;

            const customGeometry = this.customVariations[customIndex]?.parameters?.geometry;
            if (customGeometry !== undefined) {
                button.dataset.geometry = customGeometry;
            }

            button.innerHTML = `
                <div class="variation-number">${(variationIndex + 1).toString()}</div>
                <div class="variation-type">${hasCustom ? 'CUSTOM' : 'EMPTY'}</div>
            `;
            
            if (!hasCustom) {
                button.classList.add('empty-slot');
            }
        }
        
        // Click handler
        button.addEventListener('click', () => {
            if (isDefault || this.customVariations[variationIndex - this.defaultVariationCount] !== null) {
                this.engine.setVariation(variationIndex);
                this.updateVariationGrid();
            }
        });

        // Right-click for custom variations (delete)
        if (!isDefault) {
            button.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                const customIndex = variationIndex - this.defaultVariationCount;
                if (this.customVariations[customIndex] !== null) {
                    if (confirm(`Delete custom variation ${variationIndex + 1}?`)) {
                        this.deleteCustomVariation(customIndex);
                        this.populateGrid();
                    }
                }
            });
        }
        
        return button;
    }
    
    /**
     * Update variation grid to show current selection
     */
    updateVariationGrid() {
        const buttons = document.querySelectorAll('.preset-btn');
        buttons.forEach(btn => {
            btn.classList.remove('active');
            if (parseInt(btn.dataset.variation) === this.engine.currentVariation) {
                btn.classList.add('active');
            }
        });
    }
    
    /**
     * Load custom variations from localStorage
     */
    loadCustomVariations() {
        try {
            const stored = localStorage.getItem('vib34d-custom-variations');
            if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed)) {
                    const limit = this.customVariations.length;
                    this.customVariations = new Array(limit).fill(null);
                    parsed.slice(0, limit).forEach((entry, index) => {
                        this.customVariations[index] = entry;
                    });
                }
            }
        } catch (error) {
            console.warn('Failed to load custom variations:', error);
        }
    }
    
    /**
     * Save custom variations to localStorage
     */
    saveCustomVariations() {
        try {
            localStorage.setItem('vib34d-custom-variations', JSON.stringify(this.customVariations));
        } catch (error) {
            console.warn('Failed to save custom variations:', error);
        }
    }
    
    /**
     * Export all custom variations as JSON
     */
    exportCustomVariations() {
        const exportData = {
            type: 'vib34d-custom-variations',
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            variations: this.customVariations.filter(v => v !== null)
        };
        
        const json = JSON.stringify(exportData, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = 'vib34d-custom-variations.json';
        link.click();
        
        URL.revokeObjectURL(url);
    }
    
    /**
     * Import custom variations from JSON
     */
    async importCustomVariations(file) {
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            
            if (data.type === 'vib34d-custom-variations' && Array.isArray(data.variations)) {
                // Merge imported variations
                let importCount = 0;
                
                data.variations.forEach(variation => {
                    const emptyIndex = this.customVariations.findIndex(slot => slot === null);
                    if (emptyIndex !== -1) {
                        this.customVariations[emptyIndex] = variation;
                        importCount++;
                    }
                });
                
                this.saveCustomVariations();
                this.populateGrid();
                
                return importCount;
            }
        } catch (error) {
            console.error('Failed to import custom variations:', error);
        }
        
        return 0;
    }
    
    /**
     * Get variation statistics
     */
    getStatistics() {
        const customCount = this.customVariations.filter(v => v !== null).length;
        
        return {
            totalVariations: this.totalVariations,
            defaultVariations: this.defaultVariationCount,
            customVariations: customCount,
            emptySlots: this.customVariations.length - customCount,
            currentVariation: this.engine.currentVariation,
            isCustom: this.engine.currentVariation >= this.defaultVariationCount
        };
    }
}