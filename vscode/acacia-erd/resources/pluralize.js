const pluralRules = [
    { singular: /$/, plural: 's' },
    { singular: /s$/, plural: 's' },
    { singular: /(ax|test)is$/, plural: '$1es' },
    { singular: /(octop|vir)us$/, plural: '$1i' },
    { singular: /(alias|status)$/, plural: '$1es' },
    { singular: /(bu)s$/, plural: '$1ses' },
    { singular: /(buffal|tomat)o$/, plural: '$1oes' },
    { singular: /([ti])um$/, plural: '$1a' },
    { singular: /sis$/, plural: 'ses' },
    { singular: /(?:([^f])fe|([lr])f)$/, plural: '$1$2ves' },
    { singular: /(hive)$/, plural: '$1s' },
    { singular: /([^aeiouy]|qu)y$/, plural: '$1ies' },
    { singular: /(x|ch|ss|sh)$/, plural: '$1es' },
    { singular: /(matr|vert|ind)(?:ix|ex)$/, plural: '$1ices' },
    { singular: /([m|l])ouse$/, plural: '$1ice' },
    { singular: /^(ox)$/, plural: '$1en' },
    { singular: /(quiz)$/, plural: '$1zes' }
];

const irregularRules = [
    { singular: 'person', plural: 'people' },
    { singular: 'man', plural: 'men' },
    { singular: 'child', plural: 'children' },
    { singular: 'sex', plural: 'sexes' },
    { singular: 'move', plural: 'moves' }
];

const uncountableWords = [
    'equipment', 'information', 'rice', 'money', 'species', 'series', 'fish', 'sheep'
];

function pluralize(word) {
    if (uncountableWords.includes(word.toLowerCase())) {
        return word;
    }

    for (const rule of irregularRules) {
        if (word.toLowerCase() === rule.singular) {
            return rule.plural;
        }
    }

    for (const rule of pluralRules) {
        if (rule.singular.test(word)) {
            return word.replace(rule.singular, rule.plural);
        }
    }

    return word;
}

function singularize(word) {
    if (uncountableWords.includes(word.toLowerCase())) {
        return word;
    }

    for (const rule of irregularRules) {
        if (word.toLowerCase() === rule.plural) {
            return rule.singular;
        }
    }

    for (const rule of pluralRules) {
        const pluralRule = new RegExp(rule.plural.replace('$1', '(.*)'));
        if (pluralRule.test(word)) {
            return word.replace(pluralRule, rule.singular);
        }
    }

    return word;
}

function compareNames(name1, name2) {
    const singularName1 = singularize(name1);
    const singularName2 = singularize(name2);

    return singularName1.toLowerCase() === singularName2.toLowerCase();
}

function levenshteinDistance(a, b) {
    const matrix = [];

    // Increment along the first column of each row
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }

    // Increment each column in the first row
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    // Fill in the rest of the matrix
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    matrix[i][j - 1] + 1,     // insertion
                    matrix[i - 1][j] + 1      // deletion
                );
            }
        }
    }

    return matrix[b.length][a.length];
}

function compareNamesWithLevenshtein(name1, name2) {
    const distance = levenshteinDistance(name1.toLowerCase(), name2.toLowerCase());
    const maxLength = Math.max(name1.length, name2.length);

    return distance / maxLength;
}