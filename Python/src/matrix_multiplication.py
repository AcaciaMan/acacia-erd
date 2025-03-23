
def matrix_multiply(A, B):
    """
    Multiplies two matrices A and B.
    
    :param A: List of lists where each sublist is a row in matrix A
    :param B: List of lists where each sublist is a row in matrix B
    :return: Resultant matrix after multiplication
    """
    # Get the number of rows and columns for both matrices
    rows_A, cols_A = len(A), len(A[0])
    rows_B, cols_B = len(B), len(B[0])
    
    # Ensure the matrices can be multiplied
    if cols_A != rows_B:
        raise ValueError("Number of columns in A must be equal to number of rows in B")
    
    # Initialize the result matrix with zeros
    result = [[0 for _ in range(cols_B)] for _ in range(rows_A)]
    
    # Perform matrix multiplication
    for i in range(rows_A):
        for j in range(cols_B):
            for k in range(cols_A):
                result[i][j] += A[i][k] * B[k][j]
    
    return result

# Example matrices
A = [
    [1, 0, 1, 0, 0],
    [1, 1, 0, 1, 0],
    [0, 0, 1, 1, 1],
    [0, 0, 0, 1, 0],
    [0, 0, 0, 0, 1]
]

# Multiply matrices
result = matrix_multiply(A, A)
result2 = matrix_multiply(result, A)

# Print the result
for row in result2:
    print(row)