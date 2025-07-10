const TRIBUTE_CONDITIONS = {
    HEALTHY: 'Saludable',
    INJURED_MILD: 'Herido Leve',
    INJURED_SEVERE: 'Herido Grave',
    FALLEN: 'Caído'
};

const TRIBUTE_MINDSETS = {
    AGGRESSIVE: 'Agresivo',
    DEFENSIVE: 'Defensivo',
    NEUTRAL: 'Neutral'
};

const DEFAULT_NAMES = {
    MALE: ["Peeta", "Cato", "Marvel", "Finnick", "Gale", "Thresh", "Haymitch", "Brutus", "Gloss", "Cinna", "Beetee", "Boggs"],
    FEMALE: ["Katniss", "Glimmer", "Rue", "Annie", "Primrose", "Johanna M.", "Foxface", "Clove", "Cashmere", "Wiress", "Mags", "Alma"]
};
const DEFAULT_IMAGE_BASE = 'https://source.unsplash.com/random/120x120/?portrait,person,face&sig=';

class Tribute {
    constructor(id, name, district, image) {
        this.id = id;
        this.name = name;
        this.district = district;
        this.image = image;

        this.stats = {
            strength: Math.floor(Math.random() * 5) + 3,
            stealth: Math.floor(Math.random() * 5) + 3,
            intelligence: Math.floor(Math.random() * 5) + 3,
            speed: Math.floor(Math.random() * 5) + 3,
            resistance: Math.floor(Math.random() * 5) + 3 // 3-7
        };
        this.condition = TRIBUTE_CONDITIONS.HEALTHY;
        this.mindset = this.calculateMindset();
    }

    calculateMindset() {
        const rand = Math.random();
        if (rand < 0.333) {
            return TRIBUTE_MINDSETS.AGGRESSIVE;
        } else if (rand < 0.666) {
            return TRIBUTE_MINDSETS.DEFENSIVE;
        } else {
            return TRIBUTE_MINDSETS.NEUTRAL;
        }
    }

    isAlive() {
        return this.condition !== TRIBUTE_CONDITIONS.FALLEN;
    }

    reset() {
        this.condition = TRIBUTE_CONDITIONS.HEALTHY;
    }

    serializeForAI() {
        return `- ${this.name} (D${this.district}) | Estado: ${this.condition} | Mentalidad: ${this.mindset} | Stats: (FUE:${this.stats.strength}, RES:${this.stats.resistance}, VEL:${this.stats.speed}, SIG:${this.stats.stealth}, INT:${this.stats.intelligence})`;
    }
}

const GameSimulator = {
    state: {
        tributes: [],
        gameDay: 0,
        isRunning: false,
        storyHistory: "",
        arenaBiome: "Jungla densa y húmeda", 
    },
    config: {
        openRouterApiKey: "",
    },
    dom: {},

    init() {
        this.cacheDomElements();
        this.bindEventListeners();
        this.ui.showSection('inicio-section');
        this.ui.generateTributeInputs();
        this.logic.populateCastDropdown();
    },

    cacheDomElements() {
        this.dom.navLinks = document.querySelectorAll('#navigation a');
        this.dom.sections = document.querySelectorAll('main .content-section');
        this.dom.numTributesInput = document.getElementById('numTributesInput');
        this.dom.tributeInputsContainer = document.getElementById('tributeInputsContainer');
        this.dom.tributesOverviewContainer = document.getElementById('tributesOverviewContainer');
        this.dom.simulationLogOutput = document.getElementById('simulationLogOutput');
        this.dom.currentDayDisplay = document.getElementById('currentDayDisplay');
        this.dom.simulationTributesStatus = document.getElementById('simulationTributesStatus');
        this.dom.winnerMessage = document.getElementById('winnerMessage');
        this.dom.openRouterApiKeyInput = document.getElementById('openRouterApiKey');
        this.dom.aiStatus = document.getElementById('aiStatus');
        this.dom.arenaBiomeInput = document.getElementById('arenaBiomeInput');
        this.dom.castNameInput = document.getElementById('castNameInput');
        this.dom.saveCastBtn = document.getElementById('saveCastBtn');
        this.dom.loadCastSelect = document.getElementById('loadCastSelect');
        this.dom.loadCastBtn = document.getElementById('loadCastBtn');
    },

    bindEventListeners() {
        this.dom.navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = link.getAttribute('href').substring(1) + '-section';
                this.ui.showSection(targetId);
            });
        });
        document.getElementById('goToHarvestBtn').addEventListener('click', () => this.ui.showSection('cosecha-section'));
        document.getElementById('updateTributesBtn').addEventListener('click', () => this.ui.generateTributeInputs());
        document.getElementById('saveTributesBtn').addEventListener('click', () => this.logic.saveTributes());
        document.getElementById('saveSettingsBtn').addEventListener('click', () => this.logic.saveSettings());
        document.getElementById('editHarvestBtn').addEventListener('click', () => this.ui.showSection('cosecha-section'));
        document.getElementById('startGameBtn').addEventListener('click', () => this.logic.prepareAndStartSimulation());
        
        this.dom.saveCastBtn.addEventListener('click', () => this.logic.saveCast());
        this.dom.loadCastBtn.addEventListener('click', () => this.logic.loadCast());
    },

    ui: {
        showSection(sectionId) {
            GameSimulator.dom.sections.forEach(section => section.classList.remove('active'));
            const activeSection = document.getElementById(sectionId);
            if (activeSection) {
                activeSection.classList.add('active');
                const headerHeight = document.querySelector('header.app-header')?.offsetHeight || 60;
                if (activeSection.getBoundingClientRect().top < headerHeight || activeSection.getBoundingClientRect().bottom > window.innerHeight) {
                    window.scrollTo({ top: activeSection.offsetTop - headerHeight - 20, behavior: 'smooth' });
                }
            }
            GameSimulator.dom.navLinks.forEach(l => l.classList.remove('active'));
            const navLink = document.querySelector(`#navigation a[href="#${sectionId.replace('-section', '')}"]`);
            if (navLink) navLink.classList.add('active');
        },

        generateTributeInputs(tributesData = null) {
            const container = GameSimulator.dom.tributeInputsContainer;
            container.innerHTML = '';
            
            const numTributes = tributesData ? tributesData.length : parseInt(GameSimulator.dom.numTributesInput.value);
            if (isNaN(numTributes) || numTributes < 2 || numTributes % 2 !== 0) {
                alert("El número de tributos debe ser un número par y al menos 2. Se usará 24.");
                GameSimulator.dom.numTributesInput.value = 24;
                return this.generateTributeInputs();
            }

            const numDistricts = numTributes / 2;
            for (let i = 1; i <= numDistricts; i++) {
                const districtGroup = document.createElement('div');
                districtGroup.className = 'district-group';
                districtGroup.innerHTML = `<h3 class="district-title"><i class="fas fa-map-signs mr-1.5 opacity-60"></i>Distrito ${i}</h3>`;
                for (let j = 0; j < 2; j++) {
                    const tributeIndex = (i - 1) * 2 + j;
                    const existingTribute = tributesData ? tributesData[tributeIndex] : null;
                    
                    const gender = j === 0 ? "Masculino" : "Femenino";
                    const nameArray = j === 0 ? DEFAULT_NAMES.MALE : DEFAULT_NAMES.FEMALE;
                    const defaultName = nameArray[(i - 1) % nameArray.length] || `Tributo ${tributeIndex + 1}`;
                    const placeholderImage = `${DEFAULT_IMAGE_BASE}${tributeIndex + Date.now()}`;
                    
                    const tempTribute = existingTribute || new Tribute(0, '', 0, '');

                    districtGroup.innerHTML += `
                        <fieldset class="tribute-fieldset">
                            <legend>${gender}</legend>
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-3">
                                <div>
                                    <label for="tributeName${tributeIndex}" class="form-label">Nombre:</label>
                                    <input type="text" id="tributeName${tributeIndex}" value="${existingTribute ? existingTribute.name : defaultName}" class="form-input" required>
                                </div>
                                <div>
                                    <label for="tributeDistrict${tributeIndex}" class="form-label">Distrito:</label>
                                    <input type="number" id="tributeDistrict${tributeIndex}" value="${i}" class="form-input" readonly>
                                </div>
                                <div>
                                    <label for="tributeImage${tributeIndex}" class="form-label">URL Imagen (opcional):</label>
                                    <input type="url" id="tributeImage${tributeIndex}" value="${(existingTribute && existingTribute.image.startsWith('http')) ? existingTribute.image : ''}" placeholder="${placeholderImage}" class="form-input">
                                </div>
                            </div>
                            <div class="mt-4 pt-3 border-t border-gray-200">
                                <p class="form-label text-xs mb-2 text-gray-500">Estadísticas (1-10):</p>
                                <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-x-3 gap-y-2">
                                    <div>
                                        <label for="tributeStrength${tributeIndex}" class="form-label">Fuerza:</label>
                                        <input type="number" id="tributeStrength${tributeIndex}" value="${tempTribute.stats.strength}" min="1" max="10" class="form-input">
                                    </div>
                                    <div>
                                        <label for="tributeSpeed${tributeIndex}" class="form-label">Velocidad:</label>
                                        <input type="number" id="tributeSpeed${tributeIndex}" value="${tempTribute.stats.speed}" min="1" max="10" class="form-input">
                                    </div>
                                    <div>
                                        <label for="tributeResistance${tributeIndex}" class="form-label">Resistencia:</label>
                                        <input type="number" id="tributeResistance${tributeIndex}" value="${tempTribute.stats.resistance}" min="1" max="10" class="form-input">
                                    </div>
                                    <div>
                                        <label for="tributeStealth${tributeIndex}" class="form-label">Sigilo:</label>
                                        <input type="number" id="tributeStealth${tributeIndex}" value="${tempTribute.stats.stealth}" min="1" max="10" class="form-input">
                                    </div>
                                    <div>
                                        <label for="tributeIntelligence${tributeIndex}" class="form-label">Inteligencia:</label>
                                        <input type="number" id="tributeIntelligence${tributeIndex}" value="${tempTribute.stats.intelligence}" min="1" max="10" class="form-input">
                                    </div>
                                </div>
                            </div>
                        </fieldset>`;
                }
                container.appendChild(districtGroup);
            }
        },

        renderTributesOverview() {
            const container = GameSimulator.dom.tributesOverviewContainer;
            container.innerHTML = '';
            if (GameSimulator.state.tributes.length === 0) {
                container.innerHTML = `<p class="col-span-full text-center text-sm text-gray-500 py-4">No hay tributos. Ve a "La Cosecha".</p>`;
                return;
            }
            GameSimulator.state.tributes.forEach(tribute => {
                const mindsetIcon = {
                    [TRIBUTE_MINDSETS.AGGRESSIVE]: 'fa-fist-raised text-red-500',
                    [TRIBUTE_MINDSETS.DEFENSIVE]: 'fa-shield-alt text-blue-500',
                    [TRIBUTE_MINDSETS.NEUTRAL]: 'fa-leaf text-green-500' 
                }[tribute.mindset];
                const card = document.createElement('div');
                card.className = 'data-card tribute-card status-alive';
                card.innerHTML = `
                    <img src="${tribute.image}" alt="${tribute.name}" class="tribute-card-img mx-auto" onerror="this.onerror=null;this.src='${DEFAULT_IMAGE_BASE}error';">
                    <h4 class="font-semibold text-gray-800 truncate w-full" title="${tribute.name}">${tribute.name}</h4>
                    <p class="text-xs text-gray-500 mb-2">Distrito ${tribute.district}</p>
                    <div class="text-xs text-gray-600 w-full text-center border-t border-gray-200 pt-2 px-1">
                        <p title="Mentalidad: ${tribute.mindset}"><i class="fas ${mindsetIcon} mr-1.5"></i> ${tribute.mindset}</p>
                    </div>
                    <div class="text-xxs text-gray-600 w-full text-left space-y-0.5 border-t border-gray-200 mt-2 pt-2 px-1">
                        <p><i class="fas fa-dumbbell stat-icon text-red-500"></i> FUE: ${tribute.stats.strength}</p>
                        <p><i class="fas fa-running stat-icon text-blue-500"></i> VEL: ${tribute.stats.speed}</p>
                        <p><i class="fas fa-shield-alt stat-icon text-green-600"></i> RES: ${tribute.stats.resistance}</p>
                        <p><i class="fas fa-user-secret stat-icon text-purple-500"></i> SIG: ${tribute.stats.stealth}</p>
                        <p><i class="fas fa-brain stat-icon text-yellow-600"></i> INT: ${tribute.stats.intelligence}</p>
                    </div>
                `;
                container.appendChild(card);
            });
        },
        
        updateStatusSidebar() {
            const container = GameSimulator.dom.simulationTributesStatus;
            container.innerHTML = '';
            
            const sortedTributes = [...GameSimulator.state.tributes].sort((a, b) => a.district - b.district);

            sortedTributes.forEach(tribute => {
                const statusDiv = document.createElement('div');
                statusDiv.className = `simulation-status-item`;
                
                if (!tribute.isAlive()) {
                    statusDiv.classList.add('status-fallen');
                }

                statusDiv.innerHTML = `
                    <div class="flex items-center overflow-hidden flex-grow min-w-0">
                        <img src="${tribute.image}" alt="${tribute.name}" class="simulation-status-item-img" onerror="this.onerror=null;this.src='${DEFAULT_IMAGE_BASE}error_status';">
                        <span class="font-medium text-xs truncate" title="${tribute.name} (D${tribute.district})">${tribute.name} <span class="text-gray-500 font-normal text-xxs">(D${tribute.district})</span></span>
                    </div>
                     <span class="status-indicator-dot ${tribute.isAlive() ? 'alive' : 'fallen'}"></span>
                `;
                container.appendChild(statusDiv);
            });
        },

        logDayMarker(day) {
            const logEntry = document.createElement('p');
            logEntry.className = 'log-entry day-marker';
            const icon = day === 1 ? "fa-skull" : "fa-sun";
            const text = day === 1 ? "EL BAÑO DE SANGRE" : `Día ${day} en la Arena`;
            logEntry.innerHTML = `<i class="fas ${icon} mr-2"></i>--- ${text} ---`;
            GameSimulator.dom.simulationLogOutput.appendChild(logEntry);
        },

        logNarrativeBlock(narrative) {
            const logEntry = document.createElement('p');
            logEntry.className = 'log-entry narrative-block';
            logEntry.textContent = narrative.trim();
            GameSimulator.dom.simulationLogOutput.appendChild(logEntry);
            GameSimulator.dom.simulationLogOutput.scrollTop = GameSimulator.dom.simulationLogOutput.scrollHeight;
        },

        logSystemMessage(message, type = 'info') {
            const logEntry = document.createElement('p');
            logEntry.className = `log-entry system-${type}`;
            logEntry.innerHTML = `<i class="fas fa-info-circle mr-2"></i> ${message}`;
            GameSimulator.dom.simulationLogOutput.appendChild(logEntry);
            GameSimulator.dom.simulationLogOutput.scrollTop = GameSimulator.dom.simulationLogOutput.scrollHeight;
        },

        setAIStatus(message, isLoading = false) {
            const icon = isLoading ? `<i class="fas fa-spinner fa-spin mr-2"></i>` : `<i class="fas fa-robot mr-2"></i>`;
            GameSimulator.dom.aiStatus.innerHTML = `${icon} ${message}`;
        }
    },

    logic: {
        isValidUrl(string) {
            try { new URL(string); return true; } catch (_) { return false; }
        },

        saveTributes() {
            GameSimulator.state.tributes = [];
            const numTotalTributes = parseInt(GameSimulator.dom.numTributesInput.value);
            for (let i = 0; i < numTotalTributes; i++) {
                const name = document.getElementById(`tributeName${i}`).value.trim();
                const district = parseInt(document.getElementById(`tributeDistrict${i}`).value);
                const imageInput = document.getElementById(`tributeImage${i}`);
                let image = imageInput.value.trim();
                if (!name) {
                    alert(`El nombre del tributo ${i + 1} no puede estar vacío.`);
                    return;
                }
                if (!this.isValidUrl(image)) {
                    image = imageInput.placeholder;
                }
                const tribute = new Tribute(`t_${Date.now()}_${i}`, name, district, image);

                tribute.stats.strength = Math.min(parseInt(document.getElementById(`tributeStrength${i}`).value, 10) || 5, 10);
                tribute.stats.speed = Math.min(parseInt(document.getElementById(`tributeSpeed${i}`).value, 10) || 5, 10);
                tribute.stats.resistance = Math.min(parseInt(document.getElementById(`tributeResistance${i}`).value, 10) || 5, 10);
                tribute.stats.stealth = Math.min(parseInt(document.getElementById(`tributeStealth${i}`).value, 10) || 5, 10);
                tribute.stats.intelligence = Math.min(parseInt(document.getElementById(`tributeIntelligence${i}`).value, 10) || 5, 10);

                tribute.mindset = tribute.calculateMindset();
                GameSimulator.state.tributes.push(tribute);
            }
            GameSimulator.ui.renderTributesOverview();
            alert("Tributos guardados. Procede a configurar la simulación.");
            GameSimulator.ui.showSection('configuracion-section');
        },
        
        saveSettings() {
            const apiKey = GameSimulator.dom.openRouterApiKeyInput.value.trim();
            if (!apiKey.startsWith("sk-or-v1-")) {
                alert("Por favor, introduce una API Key de OpenRouter válida.");
                return false;
            }
            GameSimulator.config.openRouterApiKey = apiKey;
            alert("Ajustes guardados. Revisa el resumen de tributos.");
            GameSimulator.ui.showSection('tributos-section');
            return true;
        },

        async prepareAndStartSimulation() {
            if (GameSimulator.state.tributes.length < 2) {
                alert("¡Se necesitan al menos 2 tributos! Ve a 'La Cosecha'.");
                GameSimulator.ui.showSection('cosecha-section');
                return;
            }
            if (!this.saveSettings()) return;

            const { state, dom, ui } = GameSimulator;
            state.gameDay = 1;
            state.storyHistory = "";
            dom.simulationLogOutput.innerHTML = '';
            dom.winnerMessage.innerHTML = '';
            state.isRunning = true;
            
            state.arenaBiome = dom.arenaBiomeInput.value.trim() || "Una arena genérica sin características notables";
            
            state.tributes.forEach(t => t.reset());
            ui.updateStatusSidebar();
            ui.showSection('simulacion-section');
            
            ui.logSystemMessage("<strong>¡QUE LOS JUEGOS HAMBRIENTOS COMIENCEN!</strong>");
            
            this.runAISimulation();
        },

        async runAISimulation() {
            const { state, ui, config, dom } = GameSimulator;
            
            const livingTributes = state.tributes.filter(t => t.isAlive());
            if (!state.isRunning || state.gameDay > 7 || livingTributes.length <= 1) {
                this.endSimulation(livingTributes);
                return;
            }

            dom.currentDayDisplay.textContent = state.gameDay;
            ui.logDayMarker(state.gameDay);
            ui.setAIStatus(`La IA está generando la crónica del Día ${state.gameDay}...`, true);

            try {
                const messages = this.createAIPrompt();
                const narrative = await this.getAIDrivenDay(messages, config.openRouterApiKey);

                const cleanNarrative = narrative.replace(/VENCEDOR FINAL:.*$/i, '').trim();
                state.storyHistory += `Día ${state.gameDay}:\n${cleanNarrative}\n\n`;
                ui.logNarrativeBlock(cleanNarrative);
                ui.setAIStatus("Crónica recibida.", false);

                this.updateTributesFromNarrative(narrative);
                ui.updateStatusSidebar();

                state.gameDay++;
                
                setTimeout(() => this.runAISimulation(), 2000);

            } catch (error) {
                console.error("Error al contactar con la IA:", error);
                ui.logSystemMessage(`Error: No se pudo generar la crónica del día. Revisa tu API Key, la consola, y asegúrate de tener créditos en OpenRouter. ${error.message}`, 'danger');
                ui.setAIStatus("Error de conexión con la IA.", false);
                state.isRunning = false;
            }
        },

        createAIPrompt() {
            const { state } = GameSimulator;
            const tributesAlive = state.tributes.filter(t => t.isAlive()).map(t => t.serializeForAI()).join('\n');
            const tributesFallen = state.tributes.filter(t => !t.isAlive()).map(t => t.serializeForAI()).join('\n');

            let dayInstruction = "";
            if (state.gameDay === 1) {
                dayInstruction = "Describe el 'Baño de Sangre' inicial en la Cornucopia. Es un caos violento. Basándote en la mentalidad y estadísticas, narra quién lucha, quién huye y quién consigue recursos. Los 'Agresivos' se lanzarán a la lucha. Los 'Neutrales' buscarán suministros valiosos en los bordes. Los 'Defensivos' evitarán la confrontación a toda costa. Decide quién muere en este enfrentamiento inicial.";
            } else if (state.gameDay < 7 && state.tributes.filter(t=>t.isAlive()).length > 2) {
                dayInstruction = `Narra los eventos clave del Día ${state.gameDay}. Desarrolla la historia con lógica. Puede haber alianzas, traiciones, caza, supervivencia, heridas, muertes por el entorno o por otros tributos. Usa las estadísticas y el estado actual de los tributos para que sus acciones sean creíbles.`;
            } else {
                dayInstruction = "Este es el final. Narra la conclusión dramática de los juegos. Describe el enfrentamiento final entre los supervivientes restantes. La tensión es máxima. Al final de tu texto, Y SOLO si hay un único superviviente, declara al ganador usando la frase exacta: 'VENCEDOR FINAL: [Nombre del ganador]'. Si todos mueren, simplemente narra el trágico final sin declarar vencedor.";
            }
            
            let arenaEvent = "No hay eventos especiales hoy. El peligro son los propios tributos y el entorno.";
            const livingTributesCount = state.tributes.filter(t => t.isAlive()).length;
            if (state.gameDay >= 3 && livingTributesCount > 4) {
                const events = [
                    "Un incendio forestal se extiende rápidamente, forzando a los tributos a abandonar sus refugios hacia una zona común.",
                    "Una densa niebla tóquica con un agente alucinógeno se libera en las zonas bajas, empujando a los supervivientes a las tierras altas.",
                    "Una plaga de rastrevíspulas (avispas mutantes venenosas) es liberada cerca de una fuente de agua clave, haciéndola inaccesible y peligrosa.",
                    "Un grupo de 'mutos' (lobos genéticamente modificados con ojos de tributos caídos) es liberado para cazar a los supervivientes restantes por la noche."
                ];
                arenaEvent = events[Math.floor(Math.random() * events.length)];
            }

            const systemPrompt = `Eres un Vigilante de los Juegos del Hambre. Tu tono es omnisciente, oscuro, y despiadado. Tu única función es narrar los eventos de la arena.
REGLAS CRÍTICAS E INQUEBRANTABLES:
1.  Tu respuesta debe ser ÚNICAMENTE la narrativa del día en español. NO incluyas saludos, preámbulos, resúmenes, comentarios, enumeraciones o subtitulos. Tu respuesta empieza directamente con la narración.
2.  Menciona a los tributos por su nombre completo. Sus acciones deben ser coherentes con su mentalidad, estadísticas, el bioma y el evento del día.
3.  **MARCADOR DE MUERTE OBLIGATORIO:** Cuando un tributo muera, DEBES indicarlo explícitamente añadiendo ' (CAÍDO)' justo después de su nombre la primera vez que mencionas su muerte. Ejemplo: 'Clove cae al suelo sin vida (CAÍDO)'. ESTO ES ESENCIAL PARA QUE LA SIMULACIÓN FUNCIONE.
4.  **CONTINUIDAD ABSOLUTA:** Los tributos marcados como 'Caído' en el contexto están MUERTOS. NO PUEDEN volver a aparecer, hablar, actuar o ser mencionados como si estuvieran vivos. Ignorar esta regla rompe la simulación.
5.  Mantén la continuidad con la historia de los días anteriores y el estado actual de los tributos.
6.  Todas las armas y objetos de los jugadores deben ser básicos y agarrados de la Cornucopia, Ejemplo: Espadas, lanzas, kunais, botiquines, agua, comida.`;

            const userPrompt = `
## CONTEXTO DE LA SIMULACIÓN
**Día Actual:** ${state.gameDay}
**Bioma de la Arena:** ${state.arenaBiome}
**Resumen de Días Anteriores:**
${state.storyHistory || "No hay eventos anteriores. Es el inicio de los juegos."}

## ESTADO DE LOS TRIBUTOS
**Tributos Vivos (los únicos que pueden actuar):**
${tributesAlive || "Ninguno."}

**Tributos Caídos (están MUERTOS y no pueden participar):**
${tributesFallen || "Ninguno."}

## EVENTO DEL DÍA
**Evento Especial de la Arena:** ${arenaEvent}

## TU MISIÓN HOY
${dayInstruction}
Recuerda, cíñete a las reglas. Solo la narrativa. La coherencia es vital.`;
            return [
                { "role": "system", "content": systemPrompt.trim() },
                { "role": "user", "content": userPrompt.trim() }
            ];
        },

        async getAIDrivenDay(messages, apiKey) {
            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://aigames.com", 
                    "X-Title": "Hunger Games AI Simulator"
                },
                body: JSON.stringify({
                    "model": "deepseek/deepseek-r1-0528:free", 
                    "messages": messages
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`API Error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
            }

            const data = await response.json();
            return data.choices[0].message.content;
        },

        updateTributesFromNarrative(narrative) {
            const { tributes } = GameSimulator.state;
            tributes.forEach(tribute => {
                if (tribute.isAlive()) {
                    const deathMarker = `${tribute.name} (CAÍDO)`;
                    if (narrative.includes(deathMarker)) {
                        tribute.condition = TRIBUTE_CONDITIONS.FALLEN;
                    }
                }
            });
        },

        endSimulation(livingTributes) {
            const { state, dom, ui } = GameSimulator;
            state.isRunning = false;
            ui.setAIStatus("Simulación finalizada.", false);

            const winnerMatch = state.storyHistory.match(/VENCEDOR FINAL: (.*?)(?:\.|\n|$)/i);

            if (winnerMatch && winnerMatch[1]) {
                const winnerName = winnerMatch[1].trim();
                ui.logSystemMessage(`🏆 ¡<strong>${winnerName}</strong> es el VENCEDOR!`);
                dom.winnerMessage.innerHTML = `${winnerName} es el Vencedor!`;
            } else if (livingTributes && livingTributes.length === 1) {
                const winnerName = livingTributes[0].name;
                ui.logSystemMessage(`🏆 ¡<strong>${winnerName}</strong> es el VENCEDOR!`);
                dom.winnerMessage.innerHTML = `${winnerName} es el Vencedor!`;
            } else if (livingTributes && livingTributes.length === 0) {
                ui.logSystemMessage(`💔 ¡TRAGEDIA! No hay vencedores. Todos han caído.`);
                dom.winnerMessage.innerHTML = "¡Todos caídos! No hay vencedor.";
            } else {
                 ui.logSystemMessage(`La simulación ha concluido.`);
                 dom.winnerMessage.innerHTML = "La simulación ha concluido.";
            }
            this.updateTributesFromNarrative(state.storyHistory);
            ui.updateStatusSidebar();
        },

        saveCast() {
            const { dom, state } = GameSimulator;
            const castName = dom.castNameInput.value.trim();
            if (!castName) {
                alert("Por favor, introduce un nombre para el elenco.");
                return;
            }
            if (state.tributes.length === 0) {
                alert("No hay tributos que guardar. Por favor, créalos en 'La Cosecha' y guárdalos primero.");
                return;
            }

            const allCasts = JSON.parse(localStorage.getItem('savedCasts') || '{}');
            allCasts[castName] = state.tributes;
            localStorage.setItem('savedCasts', JSON.stringify(allCasts));
            
            alert(`Elenco "${castName}" guardado con éxito.`);
            this.populateCastDropdown();
            dom.castNameInput.value = '';
        },

        loadCast() {
            const { dom, ui } = GameSimulator;
            const castName = dom.loadCastSelect.value;
            if (!castName) {
                alert("No hay ningún elenco seleccionado para cargar.");
                return;
            }

            const allCasts = JSON.parse(localStorage.getItem('savedCasts') || '{}');
            const castData = allCasts[castName];

            if (castData) {
                GameSimulator.state.tributes = castData.map(tData => {
                    const tribute = new Tribute(tData.id, tData.name, tData.district, tData.image);
                    tribute.stats = tData.stats;
                    tribute.mindset = tData.mindset;
                    return tribute;
                });
                
                dom.numTributesInput.value = GameSimulator.state.tributes.length;
                ui.generateTributeInputs(GameSimulator.state.tributes);
                ui.renderTributesOverview();
                alert(`Elenco "${castName}" cargado. Puedes editarlo o ir a 'Ajustes' para continuar.`);
                ui.showSection('cosecha-section');
            } else {
                alert("Error: No se pudo encontrar el elenco seleccionado.");
            }
        },

        populateCastDropdown() {
            const { dom } = GameSimulator;
            const allCasts = JSON.parse(localStorage.getItem('savedCasts') || '{}');
            const castNames = Object.keys(allCasts);
            
            dom.loadCastSelect.innerHTML = '';
            if (castNames.length === 0) {
                dom.loadCastSelect.innerHTML = '<option value="">No hay elencos guardados</option>';
            } else {
                castNames.forEach(name => {
                    const option = document.createElement('option');
                    option.value = name;
                    option.textContent = name;
                    dom.loadCastSelect.appendChild(option);
                });
            }
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    GameSimulator.init();
});
