// AI Metrics Dashboard for visualizing training progress and performance
import { AIDirector } from '../game/AIDirector';

export interface DashboardConfig {
    position: { x: number; y: number };
    size: { width: number; height: number };
    visible: boolean;
    updateInterval: number;
}

export class AIMetricsDashboard {
    private scene: Phaser.Scene;
    private aiDirector: AIDirector;
    private config: DashboardConfig;
    private container: Phaser.GameObjects.Container;
    private background: Phaser.GameObjects.Graphics;
    private titleText: Phaser.GameObjects.Text;
    private metricsTexts: Phaser.GameObjects.Text[];
    private chartGraphics: Phaser.GameObjects.Graphics;
    private updateTimer: Phaser.Time.TimerEvent | null = null;
    private enemySystem: any = null; // Reference to enemy system for cost data
    
    // Chart data
    private rewardHistory: number[] = [];
    private lossHistory: number[] = [];
    private maxHistoryLength: number = 100;
    
    constructor(scene: Phaser.Scene, aiDirector: AIDirector, config?: Partial<DashboardConfig>) {
        this.scene = scene;
        this.aiDirector = aiDirector;
        
        this.config = {
            position: { x: 10, y: 10 },
            size: { width: 500, height: 400 },
            visible: true,
            updateInterval: 1000, // Update every second
            ...config
        };
        
        this.metricsTexts = [];
        this.createDashboard();
        this.startUpdateTimer();
    }
    
    private createDashboard(): void {
        // Create container
        this.container = this.scene.add.container(this.config.position.x, this.config.position.y);
        this.container.setDepth(1000); // Ensure it's on top
        
        // Create background with elegant styling
        this.background = this.scene.add.graphics();
        this.background.fillStyle(0x1a1a1a, 0.95);
        this.background.fillRoundedRect(0, 0, this.config.size.width, this.config.size.height, 15);
        this.background.lineStyle(3, 0xd4af37, 1);
        this.background.strokeRoundedRect(0, 0, this.config.size.width, this.config.size.height, 15);
        this.container.add(this.background);
        
        // Create title with elegant styling
        this.titleText = this.scene.add.text(15, 15, 'AI Training Metrics', {
            fontSize: '20px',
            color: '#d4af37',
            fontFamily: 'Cinzel, serif',
            stroke: '#d4af37',
            strokeThickness: 1
        });
        this.container.add(this.titleText);
        
        // Create metrics text areas
        const metricsLabels = [
            'Training Status:',
            'Episodes:',
            'Avg Reward:',
            'Exploration Rate:',
            'Current Budget:',
            'Budget Efficiency:',
            'Adaptive Strategy:',
            'Threat Level:',
            'Performance Score:',
            'Model Version:'
        ];
        
        metricsLabels.forEach((label, index) => {
            const text = this.scene.add.text(15, 50 + index * 22, `${label} --`, {
                fontSize: '14px',
                color: '#c9b037',
                fontFamily: 'Cinzel, serif',
                stroke: '#c9b037',
                strokeThickness: 0.5
            });
            this.metricsTexts.push(text);
            this.container.add(text);
        });
        
        // Create enemy cost section
        const enemyCostTitle = this.scene.add.text(15, 270, 'Enemy Cost Analysis:', {
            fontSize: '16px',
            color: '#d4af37',
            fontFamily: 'Cinzel, serif',
            stroke: '#d4af37',
            strokeThickness: 1
        });
        this.container.add(enemyCostTitle);
        
        // Create enemy cost labels
        const enemyCostLabels = [
            'Tank Cost: --',
            'Speedster Cost: --',
            'Elite Tank Cost: --',
            'Sniper Cost: --',
            'Swarm Cost: --',
            'Berserker Cost: --'
        ];
        
        enemyCostLabels.forEach((label, index) => {
            const text = this.scene.add.text(15, 295 + index * 18, label, {
                fontSize: '12px',
                color: '#c9b037',
                fontFamily: 'Cinzel, serif',
                stroke: '#c9b037',
                strokeThickness: 0.5
            });
            this.metricsTexts.push(text);
            this.container.add(text);
        });
        
        // Create chart graphics
        this.chartGraphics = this.scene.add.graphics();
        this.container.add(this.chartGraphics);
        
        // Set initial visibility
        this.container.setVisible(this.config.visible);
    }
    
    private startUpdateTimer(): void {
        this.updateTimer = this.scene.time.addEvent({
            delay: this.config.updateInterval,
            callback: this.updateMetrics,
            callbackScope: this,
            loop: true
        });
    }
    
    private updateMetrics(): void {
        if (!this.config.visible) return;
        
        const trainingMetrics = this.aiDirector.getTrainingMetrics();
        const modelConfig = this.aiDirector.getModelConfig();
        const trainingStatus = this.aiDirector.getTrainingStatus();
        
        // Get additional AI Director information
        const budgetStatus = this.aiDirector.getBudgetStatus();
        const tacticalStatus = this.aiDirector.getTacticalStatus();
        const adaptiveStrategy = this.aiDirector.getAdaptiveStrategy();
        const adaptiveDifficultyStatus = this.aiDirector.getAdaptiveDifficultyStatus();
        
        // Parse budget information
        const currentBudget = this.aiDirector.getCurrentBudget();
        const maxBudget = this.aiDirector.getMaxBudget();
        const budgetPercent = ((currentBudget / maxBudget) * 100).toFixed(1);
        
        // Extract threat level from tactical status
        const threatMatch = tacticalStatus.match(/Threat Level: ([\d.]+)/);
        const threatLevel = threatMatch ? parseFloat(threatMatch[1]).toFixed(2) : '0.00';
        
        // Extract performance score from adaptive difficulty status
        const performanceMatch = adaptiveDifficultyStatus.match(/Performance: ([\d.]+)/);
        const performanceScore = performanceMatch ? (parseFloat(performanceMatch[1]) * 100).toFixed(1) : '0.0';
        
        // Update text metrics
        const metricsValues = [
            trainingStatus,
            trainingMetrics.totalEpisodes.toString(),
            trainingMetrics.averageReward.toFixed(3),
            `${(trainingMetrics.explorationRate * 100).toFixed(1)}%`,
            `${currentBudget}/${maxBudget} (${budgetPercent}%)`,
            budgetStatus.includes('Efficient') ? 'High' : budgetStatus.includes('Emergency') ? 'Emergency' : 'Normal',
            adaptiveStrategy.charAt(0).toUpperCase() + adaptiveStrategy.slice(1),
            threatLevel,
            `${performanceScore}%`,
            `v${modelConfig.version}`
        ];
        
        // Update enemy cost information if enemy system is available
        if (this.enemySystem) {
            const costBreakdown = this.enemySystem.getCostBreakdown();
            const enemyCostValues = [
                `Tank Cost: ${costBreakdown.tank ? costBreakdown.tank.totalCost : 0}`,
                `Speedster Cost: ${costBreakdown.speedster ? costBreakdown.speedster.totalCost : 0}`,
                `Elite Tank Cost: ${costBreakdown.elite_tank ? costBreakdown.elite_tank.totalCost : 0}`,
                `Sniper Cost: ${costBreakdown.sniper ? costBreakdown.sniper.totalCost : 0}`,
                `Swarm Cost: ${costBreakdown.swarm ? costBreakdown.swarm.totalCost : 0}`,
                `Berserker Cost: ${costBreakdown.berserker ? costBreakdown.berserker.totalCost : 0}`
            ];
            
            // Update enemy cost texts (starting from index 10)
            enemyCostValues.forEach((value, index) => {
                const textIndex = 10 + index;
                if (textIndex < this.metricsTexts.length) {
                    this.metricsTexts[textIndex].setText(value);
                    
                    // Color coding for enemy costs
                    const cost = parseInt(value.split(': ')[1]) || 0;
                    this.metricsTexts[textIndex].setColor(
                        cost > 100 ? '#ff0000' : cost > 50 ? '#ffff00' : '#00ff00'
                    );
                }
            });
        }
        
        this.metricsTexts.forEach((text, index) => {
            const label = text.text.split(':')[0] + ':';
            text.setText(`${label} ${metricsValues[index]}`);
            
            // Color coding for important metrics
            if (index === 0) { // Training status
                text.setColor(trainingStatus.includes('Training') ? '#00ff00' : '#ffff00');
            } else if (index === 2) { // Average reward
                const reward = parseFloat(metricsValues[index]);
                text.setColor(reward > 0 ? '#00ff00' : reward < 0 ? '#ff0000' : '#ffffff');
            } else if (index === 4) { // Current Budget
                const budgetPercentValue = parseFloat(budgetPercent);
                text.setColor(budgetPercentValue > 70 ? '#00ff00' : budgetPercentValue > 30 ? '#ffff00' : '#ff0000');
            } else if (index === 5) { // Budget Efficiency
                const efficiency = metricsValues[index];
                text.setColor(efficiency === 'High' ? '#00ff00' : efficiency === 'Emergency' ? '#ff0000' : '#ffff00');
            } else if (index === 6) { // Adaptive Strategy
                const strategy = metricsValues[index].toLowerCase();
                text.setColor(strategy === 'aggressive' ? '#ff8800' : strategy === 'defensive' ? '#0088ff' : '#00ff00');
            } else if (index === 7) { // Threat Level
                const threat = parseFloat(metricsValues[index]);
                text.setColor(threat > 0.7 ? '#ff0000' : threat > 0.4 ? '#ffff00' : '#00ff00');
            } else if (index === 8) { // Performance Score
                const performance = parseFloat(metricsValues[index]);
                text.setColor(performance > 70 ? '#00ff00' : performance > 40 ? '#ffff00' : '#ff0000');
            }
        });
        
        // Update charts
        this.updateCharts(trainingMetrics);
    }
    
    private updateCharts(metrics: any): void {
        // Add new data points
        this.rewardHistory.push(metrics.averageReward);
        this.lossHistory.push(metrics.lossValue);
        
        // Limit history length
        if (this.rewardHistory.length > this.maxHistoryLength) {
            this.rewardHistory = this.rewardHistory.slice(-this.maxHistoryLength);
        }
        if (this.lossHistory.length > this.maxHistoryLength) {
            this.lossHistory = this.lossHistory.slice(-this.maxHistoryLength);
        }
        
        // Clear previous charts
        this.chartGraphics.clear();
        
        // Draw reward chart with golden theme
        this.drawChart(
            this.rewardHistory,
            { x: 230, y: 55, width: 150, height: 55 },
            0xd4af37,
            'Reward Trend'
        );
        
        // Draw loss chart with golden theme
        this.drawChart(
            this.lossHistory,
            { x: 230, y: 135, width: 150, height: 55 },
            0xc9b037,
            'Loss Trend'
        );
    }
    
    private drawChart(data: number[], bounds: any, color: number, title: string): void {
        if (data.length < 2) return;
        
        // Draw chart background with elegant styling
        this.chartGraphics.fillStyle(0x2a2a2a, 0.7);
        this.chartGraphics.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
        this.chartGraphics.lineStyle(1, 0xd4af37, 0.8);
        this.chartGraphics.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
        
        // Draw title with elegant styling
        const titleText = this.scene.add.text(bounds.x + 5, bounds.y - 18, title, {
            fontSize: '12px',
            color: '#d4af37',
            fontFamily: 'Cinzel, serif',
            stroke: '#d4af37',
            strokeThickness: 0.5
        });
        this.container.add(titleText);
        
        // Calculate data range
        const minValue = Math.min(...data);
        const maxValue = Math.max(...data);
        const range = maxValue - minValue || 1;
        
        // Draw data line
        this.chartGraphics.lineStyle(2, color, 1);
        
        for (let i = 1; i < data.length; i++) {
            const x1 = bounds.x + ((i - 1) / (data.length - 1)) * bounds.width;
            const y1 = bounds.y + bounds.height - ((data[i - 1] - minValue) / range) * bounds.height;
            const x2 = bounds.x + (i / (data.length - 1)) * bounds.width;
            const y2 = bounds.y + bounds.height - ((data[i] - minValue) / range) * bounds.height;
            
            this.chartGraphics.lineBetween(x1, y1, x2, y2);
        }
        
        // Draw current value with elegant styling
        const currentValue = data[data.length - 1];
        const valueText = this.scene.add.text(
            bounds.x + bounds.width - 50,
            bounds.y + bounds.height + 5,
            currentValue.toFixed(3),
            {
                fontSize: '11px',
                color: `#${color.toString(16).padStart(6, '0')}`,
                fontFamily: 'Cinzel, serif',
                stroke: `#${color.toString(16).padStart(6, '0')}`,
                strokeThickness: 0.3
            }
        );
        this.container.add(valueText);
    }
    
    // Public methods for dashboard control
    public show(): void {
        this.config.visible = true;
        this.container.setVisible(true);
    }
    
    public hide(): void {
        this.config.visible = false;
        this.container.setVisible(false);
    }
    
    public toggle(): void {
        this.config.visible = !this.config.visible;
        this.container.setVisible(this.config.visible);
    }
    
    public setPosition(x: number, y: number): void {
        this.config.position = { x, y };
        this.container.setPosition(x, y);
    }
    
    public setEnemySystem(enemySystem: any): void {
        this.enemySystem = enemySystem;
    }
    
    public destroy(): void {
        if (this.updateTimer) {
            this.updateTimer.destroy();
            this.updateTimer = null;
        }
        this.container.destroy();
    }
    
    // Export dashboard data
    public exportData(): any {
        return {
            rewardHistory: [...this.rewardHistory],
            lossHistory: [...this.lossHistory],
            currentMetrics: this.aiDirector.getTrainingMetrics(),
            modelConfig: this.aiDirector.getModelConfig(),
            exportedAt: new Date().toISOString()
        };
    }
}