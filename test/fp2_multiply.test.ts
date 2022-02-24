import path = require("path");
import { expect, assert } from 'chai';
const circom_tester = require('circom_tester');
const wasm_tester = circom_tester.wasm;

function bigint_to_array(n: number, k: number, x: bigint) {
    let mod: bigint = 1n;
    for (var idx = 0; idx < n; idx++) {
        mod = mod * 2n;
    }

    let ret: bigint[] = [];
    var x_temp: bigint = x;
    for (var idx = 0; idx < k; idx++) {
        ret.push(x_temp % mod);
        x_temp = x_temp / mod;
    }
    return ret;
}

function mod(a: bigint, b: bigint) {
  const res = a % b;
  return res >= 0n ? res : b + res;
}

function powMod(num: bigint, power: bigint, modulo: bigint) {
    if (modulo <= 0n || power < 0n) throw new Error('Expected power/modulo > 0');
    if (modulo === 1n) return 0n;
    let res = 1n;
    while (power > 0n) {
      if (power & 1n) res = (res * num) % modulo;
      num = (num * num) % modulo;
      power >>= 1n;
    }
    return res;
}

function invert(number: bigint, modulo: bigint): bigint {
    const _0n = 0n;
    const _1n = 1n;
    if (number === _0n || modulo <= _0n) {
      throw new Error(`invert: expected positive integers, got n=${number} mod=${modulo}`);
    }
    // Eucledian GCD https://brilliant.org/wiki/extended-euclidean-algorithm/
    let a = mod(number, modulo);
    let b = modulo;
    // prettier-ignore
    let x = _0n, y = _1n, u = _1n, v = _0n;
    while (a !== _0n) {
      const q = b / a;
      const r = b % a;
      const m = x - u * q;
      const n = y - v * q;
      // prettier-ignore
      b = a, a = r, x = u, y = v, u = m, v = n;
    }
    const gcd = b;
    if (gcd !== _1n) throw new Error('invert: does not exist');
    return mod(x, modulo);
}

describe("Fp2multiply n = 4, k = 2", function() {
    this.timeout(1000 * 1000);

    // runs circom compilation
    let circuit: any;
    before(async function () {
        circuit = await wasm_tester(path.join(__dirname, "circuits", "test_fp2_multiply_42.circom"));
    });

    // a0, a1, b0, b1, p, c0, c1
    var test_cases: Array<[bigint, bigint, bigint, bigint, bigint, bigint, bigint]> = [];
    let p: bigint = 17n;
    for (var a0 = 0n; a0 < p; a0 = a0 + 2n) {
        for (var b0 = 0n; b0 < p; b0 = b0 + 2n) {
            for (var a1 = 0n; a1 < p; a1 = a1 + 2n) {
                for (var b1 = 0n; b1 < p; b1 = b1 + 2n) {
                    var c0 = (a0 * b0 - a1 * b1 + p * p) % p;
                    var c1 = (a0 * b1 + a1 * b0) % p;
                    test_cases.push([a0, a1, b0, b1, p, c0, c1]);
                }
            }
        }
    }

    var test_field_multiply_42 = function (x: [bigint, bigint, bigint, bigint, bigint, bigint, bigint]) {
        const [a0, a1, b0, b1, p, c0, c1] = x;

        var a0_array: bigint[] = bigint_to_array(4, 2, a0);
        var a1_array: bigint[] = bigint_to_array(4, 2, a1);	
        var b0_array: bigint[] = bigint_to_array(4, 2, b0);
        var b1_array: bigint[] = bigint_to_array(4, 2, b1);
	    var p_array: bigint[] = bigint_to_array(4, 2, p);
        var c0_array: bigint[] = bigint_to_array(4, 2, c0);
        var c1_array: bigint[] = bigint_to_array(4, 2, c1);

        it('Testing a0: ' + a0 + ' a1: ' + a1 + ' b0: ' + b0 + ' b1: ' + b1 + ' p: ' + p + ' c0: ' + c0 + ' c1: ' + c1, async function() {
            let witness = await circuit.calculateWitness({"a": [a0_array, a1_array], "b": [b0_array, b1_array], "p": p_array});
	    await circuit.assertOut(witness, {"c": [c0_array, c1_array]});
            await circuit.checkConstraints(witness);
        });
    }

    test_cases.forEach(test_field_multiply_42);
});

describe("Fp2invert n = 4, k = 2", function() {
    this.timeout(1000 * 1000);

    // runs circom compilation
    let circuit: any;
    before(async function () {
        circuit = await wasm_tester(path.join(__dirname, "circuits", "test_fp2_invert_42.circom"));
    });

    // a0, a1, p, c0, c1
    var test_cases: Array<[bigint, bigint, bigint, bigint, bigint]> = [];
    let p: bigint = 17n;
    for (var a0 = 0n; a0 < p; a0 = a0 + 1n) {
        for (var a1 = 0n; a1 < p; a1 = a1 + 1n) {
            var d = (a0*a0 + a1*a1) % p;
            if(d==0n)continue;
            var inv = invert(d, p);
		    var c0 = mod(a0*inv,p);
		    var c1 = mod(-a1 * inv, p);
            test_cases.push([a0, a1, p, c0, c1]);
		}
    }

    var test_field_invert_42 = function (x: [bigint, bigint, bigint, bigint, bigint]) {
        const [a0, a1, p, c0, c1] = x;

        var a0_array: bigint[] = bigint_to_array(4, 2, a0);
        var a1_array: bigint[] = bigint_to_array(4, 2, a1);	
	    var p_array: bigint[] = bigint_to_array(4, 2, p);
        var c0_array: bigint[] = bigint_to_array(4, 2, c0);
        var c1_array: bigint[] = bigint_to_array(4, 2, c1);

        it('Testing a0: ' + a0 + ' a1: ' + a1 + ' p: ' + p + ' c0: ' + c0 + ' c1: ' + c1, async function() {
            let witness = await circuit.calculateWitness({"in": [a0_array, a1_array], "p": p_array});
	    await circuit.assertOut(witness, {"out": [c0_array, c1_array]});
            await circuit.checkConstraints(witness);
        });
    }

    test_cases.forEach(test_field_invert_42);
});

describe("Fp2square n = 4, k = 2", function() {
    this.timeout(1000 * 1000);

    // runs circom compilation
    let circuit: any;
    before(async function () {
        circuit = await wasm_tester(path.join(__dirname, "circuits", "test_fp2_square_42.circom"));
    });

    // a0, a1, p, c0, c1
    var test_cases: Array<[bigint, bigint, bigint, bigint, bigint]> = [];
    let p: bigint = 17n;
    for (var a0 = 0n; a0 < p; a0 = a0 + 1n) {
        for (var a1 = 0n; a1 < p; a1 = a1 + 1n) {
		    var c0 = (a0 * a0 - a1 * a1 + p * p) % p;
		    var c1 = (a0 * a1 + a1 * a0) % p;
            test_cases.push([a0, a1, p, c0, c1]);
		}
    }

    var test_field_square_42 = function (x: [bigint, bigint, bigint, bigint, bigint]) {
        const [a0, a1, p, c0, c1] = x;

        var a0_array: bigint[] = bigint_to_array(4, 2, a0);
        var a1_array: bigint[] = bigint_to_array(4, 2, a1);	
	    var p_array: bigint[] = bigint_to_array(4, 2, p);
        var c0_array: bigint[] = bigint_to_array(4, 2, c0);
        var c1_array: bigint[] = bigint_to_array(4, 2, c1);

        it('Testing a0: ' + a0 + ' a1: ' + a1 + ' p: ' + p + ' c0: ' + c0 + ' c1: ' + c1, async function() {
            let witness = await circuit.calculateWitness({"in": [a0_array, a1_array], "p": p_array});
	    await circuit.assertOut(witness, {"out": [c0_array, c1_array]});
            await circuit.checkConstraints(witness);
        });
    }

    test_cases.forEach(test_field_square_42);
});

