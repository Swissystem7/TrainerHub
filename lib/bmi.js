module.exports = {
    bmi: function(kg, cm) {
        if (kg <= 0 || cm <= 0) return null;
        
        const m = cm / 100;
        const index = kg / Math.pow(m, 2);
        return parseFloat(index.toFixed(1));
    }
};