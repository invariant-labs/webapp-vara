import React, { useState } from 'react'
import useStyles from './style'
import { Button, Grid, Input, Popover, Typography } from '@mui/material'
import { decodeAddress, HexString } from '@gear-js/api'

export interface IProps {
  open: boolean
  handleClose: () => void
  addToken: (address: HexString) => void
}
export const AddTokenModal: React.FC<IProps> = ({ open, handleClose, addToken }) => {
  const { classes } = useStyles()

  const [address, setAddress] = useState<HexString | null>(null)

  return (
    <Popover
      classes={{ paper: classes.paper }}
      className={classes.popover}
      open={open}
      anchorReference='none'
      onClose={handleClose}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'center'
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'center'
      }}>
      <Grid container className={classes.root} direction='column' justifyContent='space-between'>
        <Grid className={classes.upperRow} container direction='row' justifyContent='space-between'>
          <Typography>Enter the address of the token</Typography>
          <Button className={classes.close} onClick={handleClose}>
            {'\u2715'}
          </Button>
        </Grid>
        <Grid container direction='row' justifyContent='space-between' wrap='nowrap'>
          <Input
            classes={{ input: classes.input }}
            placeholder='Token address'
            onChange={e => setAddress(decodeAddress(e.target.value))}
            value={address}
            disableUnderline
          />
          <Button
            className={classes.add}
            onClick={() => {
              if (address !== null) {
                addToken(address)
                setAddress(null)
              }
            }}
            disableRipple
            disabled={address !== null && address.length === 0}>
            Add
          </Button>
        </Grid>
      </Grid>
    </Popover>
  )
}
export default AddTokenModal
