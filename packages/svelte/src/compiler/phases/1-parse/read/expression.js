/** @import { Expression } from 'estree' */
/** @import { Parser } from '../index.js' */
import { parse_expression_at } from '../acorn.js';
import { regex_whitespace } from '../../patterns.js';
import * as e from '../../../errors.js';
import { find_matching_bracket } from '../utils/bracket.js';

/**
 * @param {Parser} parser
 * @param {string} [opening_token]
 * @returns {Expression | undefined}
 */
export function get_loose_identifier(parser, opening_token) {
	// Find the next } and treat it as the end of the expression
	const end = find_matching_bracket(parser.template, parser.index, opening_token ?? '{');
	if (end) {
		const start = parser.index;
		parser.index = end;
		// We don't know what the expression is and signal this by returning an empty identifier
		return {
			type: 'Identifier',
			start,
			end,
			name: ''
		};
	}
}

/**
 * @param {Parser} parser
 * @param {string} [opening_token]
 * @param {boolean} [disallow_loose]
 * @returns {Expression}
 */
export default function read_expression(parser, opening_token, disallow_loose) {
	try {
		let comment_index = parser.root.comments.length;

		const node = parse_expression_at(
			parser.template,
			parser.root.comments,
			parser.ts,
			parser.index
		);

		let num_parens = 0;

		let i = parser.root.comments.length;
		while (i-- > comment_index) {
			const comment = parser.root.comments[i];
			if (comment.end < node.start) {
				parser.index = comment.end;
				break;
			}
		}

		for (let i = parser.index; i < /** @type {number} */ (node.start); i += 1) {
			if (parser.template[i] === '(') num_parens += 1;
		}

		let index = /** @type {number} */ (node.end);

		const last_comment = parser.root.comments.at(-1);
		if (last_comment && last_comment.end > index) index = last_comment.end;

		while (num_parens > 0) {
			const char = parser.template[index];

			if (char === ')') {
				num_parens -= 1;
			} else if (!regex_whitespace.test(char)) {
				e.expected_token(index, ')');
			}

			index += 1;
		}

		parser.index = index;

		return /** @type {Expression} */ (node);
	} catch (err) {
		// If we are in an each loop we need the error to be thrown in cases like
		// `as { y = z }` so we still throw and handle the error there
		if (parser.loose && !disallow_loose) {
			const expression = get_loose_identifier(parser, opening_token);
			if (expression) {
				return expression;
			}
		}

		parser.acorn_error(err);
	}
}
