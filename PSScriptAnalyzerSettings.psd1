@{
    Severity     = @('Error', 'Warning')

    ExcludeRules = @(
        # setup.ps1 is an interactive installer whose entire job is to print
        # coloured, formatted progress to the console. Write-Output would be
        # wrong here: its output is a pipeline value, not a message to a human.
        'PSAvoidUsingWriteHost'
    )
}
