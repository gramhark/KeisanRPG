// Init
window.addEventListener('DOMContentLoaded', () => {
    // Load saved name
    const savedName = localStorage.getItem('math_battle_player_name');
    if (savedName) {
        const nameInputEl = document.getElementById('player-name');
        if (nameInputEl) nameInputEl.value = savedName;
    }

    // Dynamic Monster Count
    if (typeof calculateTotalMonsters === 'function') {
        CONSTANTS.TOTAL_MONSTERS = calculateTotalMonsters();
        console.log("Total Monsters set to:", CONSTANTS.TOTAL_MONSTERS);
    }
    new Game();

    // Modal Close Event
    const modal = document.getElementById('image-modal');
    if (modal) {
        modal.addEventListener('click', () => {
            modal.classList.remove('active');
        });
    }
});
